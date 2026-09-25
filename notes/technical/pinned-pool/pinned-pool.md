---
title: "Pinned Memory: Who Cares, and How to Get It Faster"
date: "2026-07-31"
type: "post"
tags: ["operating-systems", "gpus"]
description: "A deep dive into the role of pinned memory for GPUs and optimizing initialization time."
---

I was inspired to write this after working on [cudf#23457](https://github.com/rapidsai/cudf/pull/23457), an optimization of pinned memory initialization times in [cuDF](https://docs.rapids.ai/api/cudf/stable/). This PR required some digging into the guts of the Linux kernel, and I thought it would be fun to write about.

# 1) Pinned Memory: Who Cares?

## Setting the Stage

From a program's point of view, memory looks like a continuous sequence of addresses. We request an arbitrary chunk of memory with `malloc(n)`, and the allocator gives us a buffer of `n` continuous memory addresses, each pointing to a byte.

```cpp
unsigned char *p = malloc(5);
for (int i = 0; i < 5; ++i) printf((void *)(p))
// 0x1011fdba0 0x1011fdba1 0x1011fdba2 0x1011fdba3 0x1011fdba4
```

As one learns in an operating systems course, these are just *virtual addresses*, and their continuity is an illusion created by the OS. Beneath this virtual address space, the operating system considers memory as a sequence of fixed-size chunks called *pages*. These virtual pages are mapped to *physical page frames* somewhere in RAM, which hold the actual bytes.

![Memory virtualization via paging.](images/paging-page-tables.png)
{caption: Virtual pages are mapped to physical page frames via page tables. ([Source](https://os.phil-opp.com/paging-introduction/)).}

In other words, the buffer we got could span across pages, and those pages could reside in entirely different physical locations.

This layer of indirection enables the OS to physically move pages as it sees fit — it may swap pages to disk to free up space, or migrate pages closer to a requesting CPU core — without disrupting the continuity of our program's virtual address space.

**Pinned memory** refers to pages that are **physically fixed to a page frame in RAM**[^pinned-vs-page-locked]. In other words, pinned pages will never be swapped or migrated. This is good for latency: our process will never have to pay for a page fault when accessing pinned memory.

Of course, nothing in life is free. Memory is a scarce resource, and pinning memory tells the operating system, "I know better — I need this memory exactly where it is, so don't do anything clever in the name of efficiency." Pinning more memory than necessary can starve other processes (or the OS itself) of RAM.

That said, a suitable amount of pinned memory is *essential* for high performance GPU applications.

## Dissecting DMA

> So why does pinned memory matter for GPUs?

Invariably, working with GPUs requires transferring data between the CPU and GPU. While this should be avoided as much as possible for performance reasons[^transfer-performance], there are usually boundaries in most programs where it is compulsory[^transfer-boundaries].

Every framework has its own transfer APIs (`x.to(device)` in PyTorch, `jax.device_put(x, device)` in JAX). These generally all boil down to some form of `cudaMemcpy`. As an example:

```cpp
// Reserve and set some host memory.
int *h_arr = (int*)malloc(bytes);
memset(h_arr, 0, bytes);

// Reserve some device memory.
int *d_arr;
cudaMalloc((int**)&d_arr, bytes);

cudaMemcpy(d_arr, h_arr, bytes, cudaMemcpyHostToDevice);  // host -> device
foo<<<grid, block, 0>>>(d_arr);                           // do something on the GPU
cudaMemcpy(h_arr, d_arr, bytes, cudaMemcpyDeviceToHost);  // device -> host
```

When we do a `cudaMemcpy`, the actual copying of bytes is performed by the GPU's [DMA (Direct Memory Access) engine](https://en.wikipedia.org/wiki/Direct_memory_access), which initiates the read instructions over PCIe. As its name implies, the DMA engine needs *direct* access to physical host memory — it is a peripheral device, not a standard OS process; therefore, it cannot use CPU virtual addresses, nor participate in the OS's virtual memory translation[^iommu].

Thus, the DMA engine takes a range of *physical bytes* on the host. You can start to imagine why it might be problematic if the host-resident bytes were in standard **pageable memory**, rather than pinned memory. What if you called:

```cpp
cudaMemcpy(d_arr, h_arr, bytes, cudaMemcpyHostToDevice);
  |
  dma_copy(dst_address=0x5678, src_address=0x1234, bytes=1000);
```

...and just after the DMA initiates the copy, the OS decides to swap or migrate the physical page containing `0x1234`? For a read, this might mean reading garbage (or worse, another process's memory); for a write, memory corruption.

To prevent these calamities, the host buffer *must be pinned* before a copy in either direction. The CUDA driver — running on your CPU[^driver-thread] — will do this for you by creating temporary, pinned staging buffers every time you make a copy. What really happens is this:

1. You call `cudaMemcpy(d_arr, h_arr, bytes, cudaMemcpyHostToDevice)`.
2. The CUDA driver obtains a pinned staging buffer `h_pinned` of length `bytes`.
3. The CUDA driver **copies** `h_arr` **from pageable memory to** `h_pinned`.
4. The CUDA driver queues a DMA copy operation from the physical address of `h_pinned` to the device address of `d_arr`.
5. The DMA engine performs the actual host-device copy.

![cudaMemcpy from pageable memory, staged through a pinned buffer.](images/pageable-memcpy-staging.png)
{caption: A host-to-device cudaMemcpy from pageable memory.}

The device-to-host direction proceeds conversely (copying `d_arr` into `h_pinned`, then `h_pinned` into `h_arr`). So, there is an extra copy between pageable and pinned memory happening under the hood with every `cudaMemcpy`, and the CUDA driver does it for you.

## Manual Pinning

> If the CUDA driver pins memory internally for me, why should I care?

The first reason is that, armed with knowledge of the internals, you can avoid the extra copy by making your host allocations *directly in pinned memory*. This is straightforward: instead of an ordinary `malloc`, you use [`cudaHostAlloc`](https://docs.nvidia.com/cuda/cuda-runtime-api/group__CUDART__MEMORY.html#group__CUDART__MEMORY_1gb65da58f444e7230d3322b6126bb4902):

```diff
- int *h_arr = (int*)malloc(bytes);
+ int *h_arr;
+ cudaHostAlloc((void**)&h_arr, bytes, cudaHostAllocDefault);
```

`cudaHostAlloc` gives you host memory that is already pinned under the hood[^cuda-malloc-host], hence making it safe for DMA access. That solves the extra-copy problem without much fuss: the subsequent `cudaMemcpy` needs no intermediate staging.

There is a second reason to pin memory manually with `cudaHostAlloc`, and that is **asynchrony**. Imagine you instead use `cudaMemcpyAsync`, hoping to overlap the transfer latency with computation. Not knowing any better, you use a plain `malloc`:

```cpp
// Reserve and set some (pageable!) host memory.
int *h_arr = (int*)malloc(bytes);
memset(h_arr, 0, bytes);

// Reserve some device memory.
int *d_arr;
cudaMalloc((int**)&d_arr, bytes);

cudaMemcpyAsync(d_arr, h_arr, bytes, cudaMemcpyHostToDevice, stream);  // host -> device
bar(); // do CPU work while we wait

foo<<<grid, block, 0, stream>>>(d_arr);  // do something on the GPU

cudaMemcpyAsync(h_arr, d_arr, bytes, cudaMemcpyDeviceToHost, stream);  // device -> host
bar();  // do CPU work while we wait

cudaStreamSynchronize(stream);  // block until the CUDA calls complete
```

This code should:

1. Queue a copy from `h_arr` to `d_arr`.
   - While that completes, compute `bar()` on host.
2. Queue the `foo(d_arr)` kernel.
3. Queue a copy from `d_arr` back to `h_arr`.
   - While those complete, compute `bar()` on host.

For the copy to be asynchronous with respect to the host, it ought to return immediately, letting us run `bar()` right away. But with `h_arr` naively allocated in pageable memory, the calling thread is burdened with staging it into pinned memory — thus, the copies are *not actually asynchronous*. The [CUDA docs](https://docs.nvidia.com/cuda/cuda-runtime-api/api-sync-behavior.html#api-sync-behavior) confess this fact:

::: indent
"The API provides memcpy/memset functions in both synchronous and asynchronous forms, the latter having an 'Async' suffix. This is a misnomer as each function may exhibit synchronous or asynchronous behavior depending on the arguments passed to the function."
:::

Let's look at some traces to make this concrete, contrasting `malloc` with `cudaHostAlloc`.

### Pageable cudaMemcpyAsync

This is a trace[^profiling-setup] of the code directly above, which uses `malloc`:

![cudaMemcpyAsync nsys timeline using a pageable buffer.](images/pageable-async.png)
{caption: Overlapping CPU work with cudaMemcpyAsync on pageable memory (doesn't work).}

The memcpys are effectively blocking: in each case, `bar()` can't run until the memcpy is complete, since the calling thread is busy staging buffers into pinned memory[^staging-pipeline]. (This sequence took 96ms.)

### Pinned cudaMemcpyAsync

This is a trace of the same code after swapping `malloc` for `cudaHostAlloc`:

![cudaMemcpyAsync nsys timeline using a pinned buffer.](images/pinned-async.png)
{caption: Overlapping CPU work with cudaMemcpyAsync on pinned memory.}

Both calls are fully asynchronous: the first `bar()` begins as soon as the first memcpy is enqueued, and the second begins as soon as the kernel and second memcpy are enqueued, since the calling thread does not need to participate in the copies. (This sequence took 78ms, about 20% faster.)

# 2) Pinned Memory: Faster Initialization

> But what's the latency of cudaHostAlloc itself?

Let's get a zoomed out view of that second trace.

![Timeline of time spent in cudaHostAlloc.](images/pinned-alloc-time.png)
{caption: cudaMemcpyAsync with cudaHostAlloc, including allocation time.}

Problem: `cudaHostAlloc` is slow. For our 256MB buffer, it took 50ms, effectively undoing the benefits of asynchrony we observed in our toy example.

In a real application, you might allocate a much larger pinned buffer in one `cudaHostAlloc` — e.g., 8-16GB — and suballocate from that single pool for all host-device transfers during the application[^rmm-behavior]. Here's a sense of initialization times at larger scales (measured on a [g6.4xlarge](https://aws.amazon.com/ec2/instance-types/g6/)):

Pool size | cudaHostAlloc Time
-- | --
1 GiB | 0.49 s
2 GiB | 0.99 s
4 GiB | 2.0 s
8 GiB | 3.9 s
16 GiB | 7.9 s

Is this a problem? If your application is hours long, probably not — a few seconds of initialization time is trivial. But if it runs for less than a minute (serving a real-time use case, for instance), initializing pinned memory could make up 10% of your latency. Or if your app uses autoscaling — dynamically spinning up and down processes — you might be paying this cost hundreds of times. In these scenarios, you might really start to care about startup costs.

## Inside cudaHostAlloc

> So what is cudaHostAlloc actually doing?

`cudaHostAlloc` needs to return `n` bytes of pinned memory. That procedure looks something like this[^cuda-caveat]:

1. Ask for a virtual address range of size `n`, e.g. via `malloc` or `mmap`.
2. Tell the OS to pin each page in the range, e.g. via [`pin_user_pages()`](https://docs.kernel.org/core-api/pin_user_pages.html).
3. Write down the physical page locations in an internal data structure managed by the CUDA driver (which essentially says, "these pages are ready for DMA.")

The expensive part is step (2). `pin_user_pages()` walks the virtual address range returned by step (1) and **triggers a page fault on each page** to back them with physical page frames. This is apparent if we peek into the [Linux source](https://elixir.bootlin.com/linux/v6.1.175/source/mm/gup.c#L3284-L3318) and walk down the stack trace:

```cpp
// pin_user_pages is called with FOLL_PIN, which eventually reaches __get_user_pages:
// https://elixir.bootlin.com/linux/v6.1.175/source/mm/gup.c#L1179-L1304

static long __get_user_pages(...)
   do {
      struct page *page;
      unsigned int foll_flags = gup_flags;
retry:
      page = follow_page_mask(vma, start, foll_flags, &ctx);
      if (!page) {
         ret = faultin_page(vma, start, &foll_flags, ...);
         // Handle errors on ret...
         goto retry;
      }
      pages[i] = page;
      start += page_increm * PAGE_SIZE;
      nr_pages -= page_increm;
   } while (nr_pages);
```

Basically, this is a loop where we look up each page in the page table (`follow_page_mask`), and if it has no physical backing, we invoke the MMU to fault it in (`faultin_page`), and then try again.

Why must we do this? The virtual address range returned by `malloc` or `mmap` may not have any physical backing due to [demand paging](https://en.wikipedia.org/wiki/Demand_paging): pages are typically backed lazily. Demand paging is generally good for efficiency, but pinned memory — by definition — needs to be *physically pinned to a page frame*, so it must be eagerly backed.

Thus a timeline of `cudaHostAlloc` looks something like this, with `pin_user_pages()` walking over each page:

![cudaHostAlloc: a crude timeline.](images/cudahostalloc-page-faults.png)
{caption: A crude timeline of cudaHostAlloc.}

Let's do some napkin math. For each page fault, the OS finds a free physical page frame, zeroes it, and installs it into the page table. A reasonable estimate might put this at 1-2 microseconds per page. At 10GB of pinned memory — equivalent to 2.5 million 4KB pages — that amounts to:

```
(1 to 2 microseconds) * (2.5 million pages) = 2.5 to 5 seconds
```

That's a long time!

## Optimization 1: Parallel Page Faults

Fundamentally, there is no reason why we have to fault in the pages serially. Instead, we can pull the code being executed in `cudaHostAlloc` out of the driver/kernel and into user space. Then, we can replace the for loop by launching a bunch of threads to fault pages in parallel:

```cpp
// MMAP the region.
void* allocation =
   mmap(nullptr, bytes, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

// Get the number of system pages (usually 4KB each) in the allocation.
const std::size_t page_size = static_cast<std::size_t>(sysconf(_SC_PAGESIZE));
auto const page_count = bytes / page_size;

// Make another pointer at the allocation, with indexes counted in bytes.
// Threads will use this to write a byte into each page.
// Note that it is volatile so that writes are not compiled away.
auto* const base = static_cast<std::uint8_t volatile*>(allocation);
std::size_t next_page = 0;

std::vector<std::thread> workers;
workers.reserve(thread_count);

for (std::size_t i = 0; i < thread_count; ++i) {
   // Each thread is responsible for a roughly equal number of pages.
   auto const pages_for_worker =
      page_count / thread_count + (i < page_count % thread_count ? 1 : 0);
   auto const first_page = next_page;
   next_page += pages_for_worker;
   workers.emplace_back([base, first_page, pages_for_worker, page_size]() {
      // Each thread simply writes one byte into each of its pages.
      for (std::size_t page = 0; page < pages_for_worker; ++page) {
         base[(first_page + page) * page_size] = 0;
      }
   });
}

for (auto& worker : workers) {
   worker.join();
}
```

Once the pages are faulted in, we can use [`cudaHostRegister`](https://docs.nvidia.com/cuda/archive/13.1.2/cuda-runtime-api/group__CUDART__MEMORY.html#group__CUDART__MEMORY_1ge8d5c17670f16ac4fc8fcb4181cb490c), which is like `cudaHostAlloc` in that it pins and registers the memory with CUDA, but accepts an existing host allocation instead of getting its own. We can simply pass in our pre-faulted allocation:

```cpp
// Since MMAP always uses whole pages, make sure we tell CUDA exactly
// how many bytes we actually reserved, rounding up to the next page.
auto const page_aligned_bytes = ((bytes + page_size - 1) / page_size) * page_size;
cudaHostRegister(allocation, page_aligned_bytes, cudaHostRegisterDefault)
```

## Optimization 2: Huge Pages

## Issue 1: The MMAP Lock

## Issue 2: NUMA Locality

[^pinned-vs-page-locked]: There is a related notion called 'page-locked' (see [mlock](https://man7.org/linux/man-pages/man2/mlock.2.html)), where the OS guarantees that the page is resident in a page frame, but can still move the page around. If your page is page-locked but not pinned, you might still pay for a '[soft page fault](https://lwn.net/Articles/600502/)', where a page that was migrated elsewhere in memory must be found and remembered. Pinning is a stronger notion where the page is fixed in place. The [CUDA docs](https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/understanding-memory.html#page-locked-host-memory) use 'page-locked' and 'pinned' interchangeably; for our purposes, they really mean 'pinned'.

[^transfer-performance]: Mark Harris has a great [blog](https://developer.nvidia.com/blog/how-optimize-data-transfers-cuda-cc/) on the performance analysis of data transfers.

[^transfer-boundaries]: E.g., a data loader or preprocessor that feeds a GPU training pipeline, printing the result of some inference task, or fetching data from local or remote storage (barring fancier techniques like [GPU Direct Storage](https://docs.nvidia.com/gpudirect-storage/)).

[^iommu]: In some cases an [IOMMU](https://en.wikipedia.org/wiki/Input%E2%80%93output_memory_management_unit), a separate component living on the chipset, interposes between the DMA engine and host memory, mapping device-visible virtual addresses (called IOVAs) to physical addresses on the host. Regardless, the DMA still needs stable physical host addresses underneath that mapping.

[^driver-thread]: More specifically, CUDA driver code (`libcudart.so`) typically runs inline on the calling thread.

[^cuda-malloc-host]: The older [`cudaMallocHost`](https://docs.nvidia.com/cuda/cuda-runtime-api/group__CUDART__MEMORY.html#group__CUDART__MEMORY_1gab84100ae1fa1b12eaca660207ef585b) does the same.

[^profiling-setup]: Profiled with [nsys]("https://developer.nvidia.com/nsight-systems"). I implemented foo() and bar() as busy loops lasting ~50ms and ~12ms respectively, and ran this on a 256MB buffer. I added [NVTX ranges](https://archive.docs.nvidia.com/nsight-visual-studio-edition/2020.1/nvtx/index.html) around the calls to bar().

[^staging-pipeline]: One might wonder why `bar()` has to wait for the *entire* memcpy: can't it run once the thread is done copying to pinned, and at least overlap with the DMA? Internally, `HtoD` isn't actually *one* pinned copy followed by *one* DMA. It is typically implemented with two buffers, where the calling thread fills one and the DMA engine drains the other, pipelined in chunks (see Nicholas Wilt's [CUDA handbook](https://www.cudahandbook.com/book/ch6/asynchronous-memcpy) for a visual). Hence `bar()` must wait until the calling thread has staged the very last chunk (resulting in a tiny bit of overlap with the final DMA, if you look *very* closely). The `DtoH`, on the other hand, has no overlap whatsoever, since the calling thread has the final action of copying the last chunk back to pageable memory (where the memory began) to complete the transfer.

[^rmm-behavior]: This is what [RMM](https://github.com/rapidsai/rmm)'s pinned memory resource does, which is used by cuDF.

[^cuda-caveat]: Note that the explanation here is based off runtime clues, since the CUDA user mode driver is not open source.
