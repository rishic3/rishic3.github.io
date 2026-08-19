---
title: "Deep Reinforcement Learning"
date: "2026-05-15"
type: "note"
tags: ["deep-learning"]
description: "Notes from CS224R: Deep Reinforcement Learning at Stanford."
---

# Deep Reinforcement Learning

A condensed version of all my notes for [CS224R](https://cs224r.stanford.edu/) at Stanford.

# Basics

## Markov Decision Process

A **Markov Decision Process (MDP)** has the following components:

- $s_t$ — state of the environment at time $t$
- $a_t$ — action taken at time $t$
- $r(s_t,a_t)$ or $r(s_t)$ — reward for given state (and action)
- $p(s_{t+1} \mid s_t, a_t)$ — environment’s transition dynamics (often stochastic)

An MDP abides by the **Markov Property:**

$$
s_{t+1} \perp \!\!\! \perp s_{t-1} \hspace{0.1cm} | \hspace{0.1cm} s_t, a_t
$$

State $s_{t+1}$ is independent of $s_{t-1}$  given $s_t$ and $a_t$ — each state is assumed to completely capture *all relevant historical information*, i.e., it is memoryless.

## Objective

The goal is to train a policy $\pi_\theta (a_t | s_t)$ which decides on an action given the state.

The policy generates sequences of actions called trajectories $\tau = s_1, a_1, \dots, s_T, a_T$.

We consider a distribution $p_\theta(\tau)$ over trajectories *$\tau$:*

$$
p_\theta(\tau) =  p(s_1, a_1, \dots, s_T, a_T) = p(s_1) \prod_{t=1} ^ T \pi_\theta (a_t | s_t) p(s_{t+1} | s_t, a_t)
$$

> Note that this distribution depends jointly on the policy and the dynamics.
> 

The objective is to maximize the expected sum of rewards over all trajectories:

$$
J(\theta) = \max_\theta \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \sum_{t=1}^T r(s_t, a_t) \right]
$$

> If the dynamics are deterministic, the expectation would collapse to just a sum.
> 

#### Partial Observations

Sometimes, we don’t have the *true* state of the environment — we only have observations.
(This breaks the Markov property, since observations are “lossy” — they don’t completely capture historical states). 

We can explicitly model partial observability through memory — allowing the policy to look at a window of $m$ previous observations:

$$
\pi_\theta(a_t | o_{t-m}, o_{t-m-1}, \dots, o_t)
$$

# Imitation Learning

## Learning Distributions

The simplest way to learn a policy is to mimic expert trajectories. 

Assume we are given a set of demonstration trajectories $\mathcal{D} \coloneqq \{(s_1, a_1, \dots, a_T, s_T)\}$.

#### Regression-based Policies

**Problem: Predicting the mean.** 
Say we use a simple L2 loss directly on $\mathcal{D}$ to learn actions.

$$
\min_\theta \frac{1}{\mathcal{D}} \sum_{(s,a) \in \mathcal{D}} || a - \hat{a} || ^2
$$

- The average action — which is optimal for squared error — may be bad or even impossible (“in-between” two good actions).
- L2 loss can only learn a *unimodal* distribution, where there is only a single mode of good actions.

#### Generative Policies

Instead, we learn a distribution $p(a \mid s)$, representing *probabilities* of different actions.

The objective is maximum likelihood estimation of the demonstration actions:

$$
\max_\theta \left[\mathbb{E}_{(s,a)\sim \mathcal{D}} (\log\pi_\theta(a|s)\right]
$$

- We use an expressive distribution $\pi(\cdot| s)$ to model complex/multimodal distributions

## Flow Matching

Learn to transform samples from Gaussian noise into samples from the data distribution.

Learn a conditional vector field:

$V_\theta(s_t, x_t, t)$ — given time $t$, position $x_t$, and state $s_t$, represents a vector field that moves us in the direction of data sample(s).

#### Training Algorithm

1. Pick a random pair $x_1 \sim D$ — data sample, $x_0 \sim \mathcal{N}(0,1)$ — Gaussian noise
2. Sample a random step size $t \sim \text{Unif}(0,1)$
    
    > Why random step sizes?
    > 
    
    This is a Monte Carlo estimation of the expectation over the whole path.
    Over the course of training, we’ll see every possible $t$ for the trajectory.
    
3. Linearly interpolate $x_t = tx_1 + (1-t)x_0$
    - $x_t$ is a single step from the noise toward a data sample.
    - During training, we build up many of these single-step vectors to form a field.
4. Minimize L2 norm: $||V_\theta(s_t, x_t, t) - (x_1-x_0)||^2$
    - Adjust parameters $\theta$ to predict a vector close to **the true noise-to-sample vector $x_1 - x_0$, starting from interpolation point $x_t$.

> How does this learn a multi-modal distribution?
> 

Different noise seeds $x_0$ can lead to different modalities, depending on where it starts in the vector field.

#### Inference Algorithm

Essentially — sample initial noise and repeatedly sample from $V_\theta$, using a fixed step size.

1. Sample noise $x_0 \sim \mathcal{N}(0,1)$
2. For $t \in \{0, \delta, 2\delta \dots, 1-\delta \}$:
    - Update $x_{t + \delta} \leftarrow x_t + \delta V_\theta(x_t, t)$
3. Return predicted $x_1$

> Why a fixed step size $\delta$?
> 

Training learns a velocity field $\frac{dx(t)}{dt} = V_\theta(s_t,x(t), t)$ with initial condition $x_0 \sim \mathcal{N}(0,1)$.

To get the true position, ideally we would integrate $x(1) = x(0) + \int_0^1 V_\theta(s_t,x(t), t) dt$. 

Since that is intractable, we use Euler integration:

$$
x(1) \approx x(0) + \sum_{k=0}^{N-1} \delta V_\theta(s,x_{k\delta}, k\delta)
$$

…which is precisely what is computed by the update above.

## Online Imitation Learning

#### Motivation

**Problems:**

- **Covariate shift.** Input data distribution may change between training and deployment.
- **Compounding errors.** Long trajectories compound small inaccuracies in predicted actions — leading further outside the data distribution.

#### DAgger

Dataset Aggregation (DAgger) — roll out the policy and collect expert labels for the action to take in each state; then, use that additional data for training.

**Algorithm:**

- Roll out learned policy $\pi_\theta: s'_1, \hat{a}_1, \dots, \hat{a}_T, s'_T$
- Query expert action at visited states to get $a^* \sim \pi_{\text{expert}}(\cdot | s')$
- Aggregate corrections with existing data $\mathcal{D} \leftarrow \mathcal{D} \cup \{(s',a^*)\}$
- Update policy via loss on aggregated data: $\min_\theta\mathcal{L}(\pi_\theta, \mathcal{D})$

We see states that are outside the training distribution (collected online) to correct for covariate shift between training/deployment.

**Human-gated DAgger:**

Roll-out policy and have expert take control for *parts* of the trajectory.

> Why? — may not be safe to roll out the fully trained agent in the real world.
> 
- Expert provides partial demonstration trajectories: $s'_t, a^*_t, \dots, a^*_T, s'_T$
- Aggregate *only the corrective actions* into the existing dataset

# Policy Gradients

## Vanilla Policy Gradient

#### Motivation

Imitation learning is limited:

- cannot outperform the expert $\pi_\text{expert}$ that collected the demonstration data
- doesn’t enable *improvement from practice*
- does not leverage reward information at all (just state, action demonstrations)

**Idea:** Instead of maximizing the log-likelihood of expert actions:

- Compute a gradient for each action, weighted by its reward.
- Update weights via gradient to
    - increase likelihood of actions that yield high reward
    - decrease likelihood of actions that yield low-reward

#### Objective

Maximize expected total reward over trajectories:

$$
\theta^* = \argmax_\theta \mathbb{E}_{\tau \sim p_\theta(\tau)} \left[ \sum_t r(s_t,a_t) \right]
$$

Vanilla policy gradient:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^N \left( \sum_{t=1}^T \nabla_\theta \log \pi_\theta (a_{i,t} | s_{i,t})\right) \left( \sum_{t=1}^T r(s_{i,t}, a_{i,t})\right)
$$

- First term: $\frac{1}{N} \sum_{i=1}^N \left(\sum_{t=1}^T\nabla_\theta \log \pi_\theta (a_{i,t}|s_{i,t})\right)$ — imitation gradient.
Log-likelihood of seeing action come out of our policy.
- Second term:  $\sum_{t=1}^T r(s_{i,t}, a_{i,t})$ — weight.
Weight log-likelihood of action by sum of rewards in trajectory $\tau_i$.

> How did we go from an expectation over $\tau \sim p_\theta(\tau)$ to $\log \pi_\theta$?
> 

The distribution over trajectories can be expanded into a product of 1) initial state, 2) action choices and 3) state transitions:

$$
p_\theta(\tau) = p(s_1) \prod_{t=1}^T \pi_\theta(a_t|s_t)p(s_{t+1} | s_t, a_t)
$$

Taking the log:

$$
\log p_\theta(\tau) =  \log p(s_1) + \sum_{t=1}^T \log \pi_\theta(a_t|s_t) + \log p(s_{t+1} | s_t, a_t)
$$

Taking the gradient, the world dynamics and the initial state do not depend on $\theta$ → gradient 0.

#### REINFORCE Algorithm

Run the policy and collect a batch of trajectories, then improve the policy using the vanilla policy gradient over the trajectories.

1. Sample a batch of $N$ trajectories $\{\tau^i\}$ from $\pi_\theta(a_t|s_t)$
2. Compute gradient $\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^N \left(\sum_{t=1}^T \nabla_\theta \log \pi_\theta(a_t,s_t) \right)  \left( \sum_{t=1}^T r(s_{i,t}, a_{i,t})\right)$
3. Update $\theta \leftarrow \theta + \alpha\nabla_\theta J(\theta)$

## Policy Gradient Improvements

**Problem 1: Future actions don’t affect previous actions.**

Consider a trajectory where the first 75% of actions are bad, but the last 25% of actions are good — sum of rewards is negative. The later bad actions should not drag down the earlier good actions.

**Problem 2: Absolute rewards are noisy.**

Reward function doesn’t distinguish between actions that are good in an **absolute sense** (reward > 1), but **below average** compared to alternatives.
Consider a batch where all rewards are positive — everything gets reinforced, even though some actions may be suboptimal. 

#### Using Causality

**Idea:** weight an action by the *future* rewards in its trajectory — i.e., don’t penalize it for bad actions that came previously.

Replace the sum of rewards with a “reward-to-go”:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N} \sum_{i=1}^N \left(\sum_{t=1}^T \nabla_\theta \log \pi_\theta(a_t,s_t) \right)  \left( \sum_{t'=t}^T r(s_t, a_t)\right)
$$

#### Using Baselines

**Idea:** subtract the *average reward of all trajectories* from the reward term — i.e., rewards weight is relative to the average.

Subtract a constant baseline:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \left(\sum_{t=1}^T \nabla_\theta \log \pi_\theta (a_{i,t} | s_{i,t}) \right) \left( \left( \sum_{t'=t}^T r(s_{i,t'}, a_{i,t;}) \right) - b\right)
$$

where the baseline is the average reward of a trajectory:

$$
b = \frac{1}{N}\sum_{i=1}^NR(\tau)
$$

> Is this unbiased?
> 

This does not change the gradient in expectation, since $\nabla_\theta b = 0$ — i.e., the baseline does not depend on the sampled action $a_t$ from the policy after conditioning on $s_t$. 

## Off-Policy Gradients

#### Motivation

On-policy learning is data inefficient — we recollect trajectories for every gradient step.

We would like to take multiple gradient steps using a single batch of trajectories.

However, if we do this naively:

- Collect trajectories from old policy distribution $p_{\theta}(\tau)$
- Update policy **multiple times** using old trajectories to get $p_{\theta'}(\tau)$

this introduces bias, since $p_{\theta'} \neq p_\theta$. The expectation is over the old data distribution, yet we are updating the log-probability of a new data distribution:

$$
\mathbb{E}_{\tau \sim p_{\theta}(\tau)} \left[\left(\sum_t \nabla_\theta \log \pi_{\theta'}(a_t |s_t)\right) R(\tau)\right], \\ \text{Bias} = \int \big[p_{\theta}(\tau) - p_{\theta'}(\tau)\big]\, \nabla_\theta \log p_{\theta'}(\tau)\, R(\tau)\, d\tau
$$

#### Importance Sampling

**Idea:** use a *proposal* distribution $q$ to rewrite the objective as an expectation over $q$, while weighting **by an *importance ratio* — thus changing the distribution *without* biasing the estimator. 

$$
\mathbb{E}_{x \sim p(x)}[f(x)] = \int \frac{q(x)}{q(x)} p(x) f(x) dx = \mathbb{E}_{x \sim q(x)} \left[ \frac{p(x)}{q(x)}f(x)\right]
$$

The importance weight $\frac{p(x)}{q(x)}$ corrects the importance of $x$ based on how likely it is to appear in the true distribution $p(x)$. 

- $\frac{p(x)}{q(x)} > 1$ → higher-likelihood under $p(x)$ than $q(x)$, assign greater weight
- $\frac{p(x)}{q(x)} < 1$ → lower-likelihood under $p(x)$ than $q(x)$, assign lower weight

Consider the importance weight for the policy gradient, where $p_{\theta'}(\tau)$ is the proposal distribution:

$$
\frac{p_\theta(\tau)}{p_{\theta'}(\tau)} = \frac{p(s_1)\prod_{t=1}^T \pi_\theta(a_t | s_t) p(s_{t+1}|s_t,a_t)}{p(s_1)\prod_{t=1}^T \pi_{\theta'}(a_t | s_t)p(s_{t+1}|s_t,a_t)} = \prod_{t=1}^T\frac{ \pi_\theta(a_t | s_t)}{ \pi_{\theta'}(a_t | s_t)}

$$

This gives the *off-policy* policy gradient:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N}\sum_{i=1}^N \left[\prod_{t=1}^T\frac{ \pi_\theta(a_{i,t} | s_{i,t})}{ \pi_{\theta'}(a_{i,t} | s_{i,t})} \left(\sum_{t=1}^T \nabla_\theta \log \pi_\theta (a_{i,t} | s_{i,t}) \right) \left( \left( \sum_{t'=t}^T r(s_{i,t'}, a_{i,t;}) \right) - b\right)\right]
$$

**Algorithm:**

1. Collect data using policy $\pi_\theta$.
2. Take **$k$ gradient steps** using the policy gradient with importance sampling, where
    - $\pi_\theta$ — original distribution
    - $\pi_{\theta}^i$ — proposal distribution at gradient step $k$
3. Repeat.

#### State-Action Marginal

**Why?** The term

$$
w_i = \prod_{t=1}^T\frac{ \pi_\theta(a_{i,t} | s_{i,t})}{ \pi_{\theta'}(a_{i,t} | s_{i,t})} 

$$

can cause exploding/vanishing gradients for long trajectories $T$ if the two distributions differ *even slightly —* e.g., $1.1^T$ or $0.9^T$.

Fundamentally, the importance weight is correcting for *two things*:

1. **Action mismatch:** $\pi_\theta$ and $\pi_{\theta'}$ assign different probabilities to $a_{i,t}$
2. **State mismatch:** $\pi_\theta$  and $\pi_{\theta'}$ visit different states, as a result of dynamics, stemming from differences in the chosen action

**Idea: f**actor the distribution into **two pieces** — world dynamics and action action selection:

$$
\frac{p_\theta(s_t, a_t)}{p_{\theta'}(s_t, a_t)} = \frac{p_\theta(s_t)}{p_{\theta'}(s_t)} \cdot \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta'}(a_t \mid s_t)}
$$

**Approximation:** Assume state marginals are close: $\frac{p_\theta(s_t)}{p_{\theta'}(s_t)} \approx 1$.

Over many rollouts, both policies are likely to visit the *same set of states* with *approximately the same frequencies*, even if action distributions differ.

Thus the importance weight simplifies to:

$$
\frac{p_\theta(s_t, a_t)}{p_{\theta'}(s_t, a_t)} \approx \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta'}(a_t \mid s_t)}
$$

…yielding a **per-timestep** importance weight, instead of a product over timesteps:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N}\sum_{i=1}^N\sum_{t=1}^T \frac{\pi_\theta (a_{i,t} | s_{i,t})}{\pi_{\theta'}(a_{i,t}|s_{i,t})}\nabla_\theta \log \pi_\theta (a_{i,t}|s_{i,t}) \left( \left( \sum_{t' = t}^T r(s_{i,t'}, a_{i,t'})\right) - b \right)
$$

Thus, we accept a small bias (the state mismatch) to eliminate the product over timesteps. 

#### Trust-Region Policy Optimization

We can also constrain the new policy $\pi_{\theta'}$ to not stray *too far* from the old policy $\pi_\theta$.

We restrict the KL divergence between the policies in the objective:

$$
J_{\text{TRPO}}(\theta) = \frac{1}{N}\sum_{i=1}^N \sum_{t=1}^T \frac{\pi_\theta(a_{i,t} \mid s_{i,t})}{\pi_{\theta'}(a_{i,t} \mid s_{i,t})} \left( \sum_{t'=t}^T r(s_{i,t'}, a_{i,t'}) - b\right) \\ 
\text{subject to} \quad\mathbb{E}_{s \sim \pi_{\theta_k}} \left[D_{\text{KL}}\!\left(\pi_{\theta_k}(\cdot \mid s) \;\|\; \pi_\theta(\cdot \mid s)\right)\right] \leq \delta
$$

This is a **hard constraint** on the objective — the current $\pi_\theta$ is not allowed to “learn too much”.

> Alternatively, the KL divergence can be implemented as a regularization / loss penalty.
> 

# Actor-Critic

## Estimating Reward-to-go

#### Motivation

In policy gradients, ****rewards are summed over a *single trajectory.*

- Single trajectory can be noisy, especially in high-variance models / dynamics.
    - Same action can get very different returns — future randomness is high.
- If rewards are sparse, the model will not make good use of actions *within* a trajectory.
    - Must wait until episode ends to know if actions are good.
    - Credit assignment problem — we don’t know which action led to a sparse reward.

We would like a *global view* of how good an action is, to make the signal less noisy.

Can we learn to *estimate* what actions are good and bad for better reward signal?

#### Advantage-weighted Policy Gradient

We want to replace the current reward-to-go estimate $\sum_{t' = t}^T r(s_{i,t'}, a_{i,t'})$ with an expectation over *all trajectories*.

This is precisely captured by the $Q$ function, which tells us the value of an action $a_t$ in state $s_t$, in expectation over all future trajectories:

$$
Q(s_t, a_t) = \mathbb{E}_{\tau} \left[\sum_{t' = t}^T r(s_{t'}, a_{t'}) \mid s_{t}, a_t\right]
$$

The baseline $b$ — previously an average reward over all trajectories — can also be improved.
We can instead model the average reward for the *particular state* we are considering.

This is precisely captured by the $V$ function:

$$
V(s_t)= \frac{1}{N} \sum_{i=1}^N Q(s_{i,t}, a_{i,t})
$$

Thus the new reward weight is the advantage function $A(s_t,a_t) = Q(s_t,a_t) - V(s_t)$:

$$
\nabla_\theta J(\theta) \approx \frac{1}{N}\sum_{i=1}^N\sum_{t=1}^T \nabla_\theta \log \pi_\theta (a_{i,t}|s_{i,t})\  A(s_t, a_t)
$$

We weight an action $a$, given state $s$, by *how much better* the expected reward of that action is ($Q$), relative to the expected reward at that state in general ($V$).

**Algorithm**

1. Initialize the policy (using imitation learning, heuristics, etc.)
2. Fit a critic model to estimate the expected reward
    - I.e., estimate $V$, $Q$, or $A$
3. Update the policy model using the gradient, using weights provided by the critic

## Estimating Expected Rewards

Our goal is to learn the $Q$ function:

$$
Q(s_t, a_t) = r(s_t, a_t) + \mathbb{E}_{s_{t+1} \sim p(\cdot |s_t,a_t)} \left[V(s_{t+1}) \right]
$$

Computing an expectation over all possible next states $s_{t+1} \sim p(\cdot |s_t,a_t)$ is difficult.
We’ll instead estimate this using the *specific* state $s_{t+1}$ that we saw in the trajectory:

$$
Q(s_t, a_t) \approx r(s_t, a_t) + V(s_{t+1})
$$

Thus, if we learn $V$, we can derive $Q$.

#### Monte Carlo Estimation

Supervise using roll-out’s summed rewards.

1. Collect a bunch of (state $s$, reward-to-go from $s$) pairs across all trajectories:
    
    $$
    \left\{ \left(s_{i,t},\sum_{t'=t}^Tr(s_{i,t'}, a_{i,t'}\right)\right\}
    $$
    
2. Train a model $\hat{V}^\pi_\phi$ using L2 regression:
    
    $$
    \mathcal{L}(\phi) = \frac{1}{2} \sum_{i=1}^N || \hat{V}_\phi^\pi (s_i) - y_i||^2
    $$
    

> How is this better than single-trajectory reward-to-go?
> 
- If we have multiple trajectories from a given state, $V$ averages across those trajectories.
- $V$  can generalize to new states.

**Monte Carlo — Pros/Cons:**

- + Unbiased — true returns seen in trajectory
- - High Variance — depends on full trajectory of randomness

#### Bootstrap (TD) Estimation

Supervise using 1-step reward followed by our own value estimate.

Train using L2 regression on pairs:

$$
\left\{ \left(
s_{i,t},\ r(s_{i,t}, a_{i,t}) + \hat{V}_\phi^\pi(s_{i,t+1}) \right)\right\}
$$

**Intuition:**

Update immediately using one *real step*, then rely on the current guess.

When our model is good, this is a better approximation of expected sum of rewards — compared to what we *actually* saw in the single trajectory (Monte Carlo), which is noisy.

**Bootstrap — Pros/Cons:**

- + Low variance — short horizon
- - High bias — errors in $\hat{V}$ propagate through labels (and into next update)

#### Hybrid Monte Carlo + Bootstrap

Use $n$ real rewards, then bootstrap.

$$
\left\{ \left(
s_{i,t},\ \sum_{t'=t}^{t+n-1}r(s_{i,t'}, a_{i,t'}) + \hat{V}_\phi^\pi(s_{i,t+n}) \right)\right\}
$$

$n$ controls tradeoff between trusting real data vs. learned estimates.

- + Lower variance than Monte Carlo (learn across trajectories)
- - Lower bias than pure bootstrap (use several steps of real reward signal)

#### Discount Factors

**Problem:** Very long trajectories can lead to infinitely large $\hat{V}_\phi^\pi$.

Target depends on very long future — credit assignment is weaker.

Rewards very far in the future (far enough to be irrelevant) propagate to the current state. 

**Idea:** Geometrically down-weight future rewards to stabilize training.

$$
y_{i,t} = \sum_{t'=t}^{t+n-1} \gamma^{t'-t}r(s_{i,t'},a_{i,t'}) + \gamma^n \hat{V}^\pi_\phi (s_{i,t+n}), \qquad \gamma \approx 1 - \epsilon
$$

Enforces effective horizon of reward steps — agent only cares about the next $\approx \frac{1}{1-\gamma}$ steps; beyond that, the value contribution is $\approx 0$.

- Lower $\gamma$ → higher bias (more myopic)
- Higher $\gamma$ → higher variance (more noise in future rewards)

# Off-Policy Actor-Critic

**Motivation:** On-policy learning is data inefficient. Need to re-collect full batch of rollouts with every gradient update. How can we make multiple gradient steps per batch of data?

**Challenge:** Stale advantages.

Say we have an old policy **$\pi_{\theta'}$**, ****and we want to train our current policy $\pi_\theta$.
If we introduce importance weights to actor-critic:

$$
\nabla_\theta J(\theta) \approx \sum_{i,t} \frac{\pi_{\theta}(a_{i,t}|s_{i,t})}{\pi_{\theta'} (a_{i,t} s_{i,t})} \nabla_{\theta}  \log \pi_\theta (a_{i,t} \mid s_{i,t}) \hat{A}^{\pi_{\theta'}}(s_{i,t}, a_{i,t})
$$

$\hat{A}^{\pi_{\theta'}}(s,a)$ says: 

How good is action $a$ relative to other actions the *old policy* $\pi_{\theta'}$ could choose?

As current policy $\pi_\theta$ starts to drift from the old policy $\pi_{\theta'}$, old advantage $\hat{A}^{\pi_{\theta'}}$ is no longer accurate.

- Estimate of rewards that $\pi_{\theta'}$ has never seen, but $\pi_\theta$ is now visiting, is noisy
- Incentivized drift: if $\pi_{\theta'}$ had very low probability for action $a$, importance weight can **massively up-weight** probability of $a$ in $\pi_\theta$ if it has *even a little bit* of reward

How do we constrain $\pi_\theta$ from not drifting too far from $\pi_{\theta'}$?

#### Penalize Policy Divergence

**Strategy 1:** Penalize model using KL divergence term as regularization.

$$
J_{\text{reg}}(\theta) = J(\theta) - \beta\sum_{i,t}D_{\text{KL}} \left(\pi_\theta(a_{i,t}|s_{i,t}) \mid\mid \pi_{\theta'}(a_{i,t}|s_{i,t})\right) 
$$

Higher $\beta$ → stronger penalization for divergence.

- Does not *explicitly* limit learning in weight-space $\theta$
- Does try to limit drift in distribution space $p_\theta(a|s)$

#### Clip Importance Weights

**Strategy 2:** Clip the importance weights to prevent policy drift.

$$
1 - \epsilon \le \frac{\pi_\theta (a_{i,t} | s_{i,t}) }{\pi_{\theta'} (a_{i,t} s_{i,t})} \le 1+\epsilon
$$

**Intuition** — **r**emove the incentive for policy drift.

$\pi_\theta$ can only scale up the advantage by at most $1+ \epsilon$
$\pi_\theta$ can only scale down the advantage by at most $1-\epsilon$

Ratio in log-likelihood of an action between the two policies is bounded — can only scale the advantage by an increment of $\epsilon$.

> When should we use KL regularization vs. clipping?
> 

KL divergence is sometimes hard to compute when $\pi(a|s)$ is complex. E.g. diffusion models — easier to use clipping. In LLMs (simple categorical distribution), KL regularization is easy.

## Proximal Policy Optimization

**Strategy:** Take multiple gradient steps per batch by clipping importance weights.

#### Trick 1: Clipping

Clip the importance weights:

$$
J_{\text{PPO}}(\theta) \approx \sum_{i,t} \text{clip}\left(\frac{\pi_\theta (a_{i,t} | s_{i,t}) }{\pi_{\theta'} (a_{i,t} s_{i,t})} ,\ 1-\epsilon,\ 1+\epsilon\right)\hat{A}^{\pi_{\theta'}}(s_{i,t}, a_{i,t})
$$

…where $\text{clip}(x) = \max(\min(x,\ 1-\epsilon),\ 1+\epsilon)$.

Policy is no longer incentivized to deviate significantly.

#### Trick 2: Minimize against unclipped

Take the minimum w.r.t. the original objective:

$$
J_{\text{PPO}}(\theta) \approx \sum_{i,t} \min \left[J(\theta),\ \text{clip}\left(\frac{\pi_\theta (a_{i,t} | s_{i,t}) }{\pi_{\theta'} (a_{i,t} s_{i,t})} ,\ 1-\epsilon,\ 1+\epsilon\right)\hat{A}^{\pi_{\theta'}}(s_{i,t}, a_{i,t})\right]
$$

**Intuition:** Clip away excessive improvement, but do *not* clip away excessive damage, so that we can correct it fully.

$$
L^\text{CLIP}(\theta) \le L^\text{unclipped}(\theta)
$$

- If $\pi_\theta$ mistakenly *decreases* the probability of a *good* action, i.e. $\text{ratio} < 1 - \epsilon$ and $A > 0$, do not clip to $1-\epsilon$; $\min$ takes the worse penalty $\text{ratio} \cdot A$.
- If $\pi_\theta$ mistakenly *increases* the probability of a *bad* action, i.e., $\text{ratio} > 1 + \epsilon$ and $A < 0$, do not clip to $1 + \epsilon$; $\min$ takes the worse penalty $\text{ratio} \cdot A$.

#### Trick 3: Generalized Advantage Estimation

Instead of using a single $n$ for Monte Carlo + bootstrap-learning of $V$, use a weighted average over all $n$:

$$
\hat{A}_{\text{GAE}}^\pi(s_t, a_t) = \sum_{n=1}^{\infty} w_n \hat{A}_n^\pi(s_t,\ a_t) \\ w_n \propto \lambda^{n-1} \quad \text{for } n = 1, \dots, N, \text{ where } N \ll T, \text{ and } \lambda \in [0,1]
$$

$\lambda$ — how much weight to put on the $n$-step estimator (decreasing as $n$ increases).

- Small $\lambda$ → more bootstrapping; lower variance, higher bias.
- Large $\lambda$ → less bootstrapping; higher variance, lower bias.

## Soft Actor-Critic

PPO allows us to take several off-policy gradient steps.

Can we go *much more off-policy* — using data from the full history of iterations?

#### Replay Buffer

**Idea:**

- Maintain a buffer of all past data, and sample a batch at each iteration.
- Re-collect data *every iteration*, but only a few timesteps → add to replay buffer.

Algorithm:

1. Collect new experience $\{s_i, a_i\}$ from $\pi_\theta$ and add to buffer $\mathcal{R}$.
2. Sample a minibatch $\mathcal{B} = \{s_i, a_i, r_i, s_i'\}$ of size $N$ from $\mathcal{R}$:
    1. Fit $\hat{V}_\phi^{\pi_\theta}$ to sampled rewards in $\mathcal{B}$ (e.g. one-step bootstrap):
        
        $$
        \mathcal{L}(\phi) = \frac{1}{2} \sum_{i=1}^N || \hat{V}_\phi^\pi (s_i) - \left( r(s_{i,t},\ a_{i,t}) + \gamma \hat{V}_\phi^\pi(s_{i,t+1}) \right)||^2
        $$
        
    2. Evaluate the advantage function on $i \in \mathcal{B}$:
        
        $$
        \hat{A}^{\pi_\theta}(s_{i,t},\ a_{i,t}) = r(s_{i,t},\ a_{i,t}) + \gamma \hat{V}_\phi^{\pi_\theta}(s_{i,t+1}) - \hat{V}_\phi^{\pi_\theta}(s_{i,t}) \qquad \forall i,t
        $$
        
    3. Evaluate the policy gradient on all $i \in \mathcal{B}$:
        
        $$
        \nabla_\theta J(\theta) \approx \sum_{i,t} \nabla_\theta \log \pi_\theta (a_{i,t} \mid s_{i,t}) \hat{A}^{\pi_\theta}(s_{i,t}, a_{i,t})
        $$
        
    4. Update $\theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)$.
3. Repeat.

#### Q-Function Estimation

**Problem: Biased value function.**

We train $V$ to predict the label:

$$
y_{i,t} \approx r(s_{i,t},\ a_{i,t}) + \gamma \hat{V}_\phi^\pi(s_{i,t+1}) 
$$

This is a mixture of a *bunch of old policies* that added data to the replay buffer.

Hard to correct — cannot use importance weights (many other distributions).

**Idea:** Instead of $V(s)$, learn $Q(s,a)$:

$$
Q^{\pi_\theta}(s,a) = r(s,a) + \gamma Q^{\pi_\theta}(s', \bar{a}')
$$

Learn to predict:

- $r(s,a)$ — the reward an ***old policy got*** from taking action $a$
- $Q^{\pi_\theta}(s', \bar{a}')$ — value of being in the next state and taking an action from our *current policy*

**Intuition:** Use the observed transition from the replay buffer, then *seed* the critic with an action from our current policy. 

First-step reward is from the replay buffer, remaining long-horizon rewards are “imagined” by the critic under the current policy.

Requires sufficient action coverage in the replay buffer to work well ($Q$ may be very noisy on new actions that are completely OOD). 

SAC uses $Q$ directly instead of $A$ (lose baseline, but we’re using a lot more data—replay buffer).

# Q-Learning

In policy gradients, we “nudge the policy toward actions that look better”. 

The policy $\pi$ is a way to *estimate* which actions are good under the critic.

**Idea:** Why fit $\pi$? We already *have* a good model of good actions: $Q$. Just choose the best one!

$$
\pi_{\text{new}}(a_t \mid s_t) = \begin{cases} 
1 & \text{if }\ a_t = \argmax_a \hat{Q}_\phi^\pi(s_t, a) \\
0 & \text{otherwise}
\end{cases}
$$

Policy is entirely determine by $Q$ function — no policy gradient. 

## Q-Learning Algorithm

**Idea:** Learn $Q$ *assuming* that we will act greedily from then onwards.

Use a replay buffer of all past data:

- Samples in a batch are highly correlated — break correlation via random batch
- Increase diversity per SGD step

#### Bellman Equation

Consider the *optimal policy $\pi^*$*. The Bellman optimality equation describes $Q^{\pi^*}$:

$$
Q^{\pi^*}(s,a) = r(s,a) + \gamma \mathbb{E}_{s' \sim p(\cdot | s,a)} \left[ \max_{\bar{a}'} Q^{\pi^*} (s', \bar{a}')\right]
$$

- $r(s,a)$ — the one-step reward
- $\max_{\bar{a}'} Q^{\pi^*} (s', \bar{a}')$ — the action $\pi^*$ would take in state $s'$, i.e., the best possible action conditioned on state $s'$.

This is a recursive definition of $Q^{\pi^*}$ that converges to the **return under the optimal policy.**

Good for off-policy learning:

$Q$-learning *learns from transitions* — we can learn from a different policy’s transitions while behaving according to another. Old transitions provide evidence about *dynamics*.

Bellman equation is useful for any transition, even if it came from an older version of policy.

**Algorithm:**

1. Take action $a \sim \pi(a|s)$, and get $(s, a, s', r)$ and store in replay buffer $\mathcal{R}$.
2. Sample a batch $\mathcal{B} = \{s_i, a_i, r_i, s_i'\}$ from $\mathcal{R}$.
3. Update $\hat{Q}^\pi_\phi$ using single-step TD based on the (implicit) optimal policy $\pi^*$:
    
    $$
    y_i = r_i + \gamma \max_{a'}\hat{Q}_\phi(s_i', a')
    $$
    
4. Update our policy:
    
    $$
    \pi_{\text{new}}(a_t \mid s_t) = \begin{cases} 
    1 & \text{if }\ a_t = \argmax_a \hat{Q}_\phi(s_t, a) \\
    0 & \text{otherwise}
    \end{cases}
    $$
    

**Challenge:** Exploration.

The implicit policy is greedy (always takes $\argmax$). The function $\hat{Q}_\phi^\pi$ is hard to learn — it requires understanding *lots of different actions*, but greedy policy always exploits.

#### Exploration Policy

Instead of sampling action $a \sim \pi(a|s)$ from our greedy algorithm, use a more exploratory policy.

**Option: Epsilon-Greedy**

$$
\pi(a_t \mid s_t) = \begin{cases} 
1-\epsilon & \text{if }\ a_t = \argmax_a \hat{Q}_\phi(s_t, a) \\
\frac{\epsilon}{|\mathcal{A}| - 1} & \text{otherwise}
\end{cases}
$$

- With probability $1-\epsilon$, take the greedy action.
- With probability $\epsilon$, choose one of the other actions uniformly.
(Each action gets probability$\frac{\epsilon}{|\mathcal{A}| - 1}$).

**Option: Boltzmann Exploration**

$$
\pi(a_t \mid s_t) \propto \exp(\hat{Q}_\phi(s_t, a_t))
$$

- Take actions with probability proportional to their Q-value.
- Prefer greedy actions, but sometimes explore slightly suboptimal actions.

## Q-Learning Improvements

**Problem 1: $r(s_i, a_i) + \gamma \max_{a'} Q_\phi (s_i' a')$** is a moving target.

- Every gradient step changes both $Q_\phi(s_t, a_t)$ and the target $\gamma \max_{a'} Q_\phi (s_i' a')$
- Sensitivity — due to $\argmax$, small changes in $Q$ can suddenly change selected action

**Problem 2:** action overestimation.

- If $Q$ makes random errors, $\max$ tends to pick *overestimated actions*
- Propagates into the gradient update — compounding overestimation in updated network

#### Target Q Networks

**Fix problem 1:** Freeze the target $Q$ network that we optimize against, only updating periodically.

**Algorithm:**

1. Save target network parameters $\phi' \leftarrow \phi$
2. For $N$ iterations:
    1. Take action $a \sim \pi_{\text{explore}}(a|s)$ and get $(s, a, s', r)$. Store in replay buffer $\mathcal{R}$.
    2. For $K$ iterations:
        1. Sample a batch $\mathcal{B} = \{s_i, a_i, r_i, s_i'\}$ from $\mathcal{R}$.
        2. Update $\hat{Q}^\pi_\phi$ using single-step TD gradient, based on (implicit) optimal policy $\pi^*$:
        
        $$
        \phi \leftarrow \phi - \alpha \sum_{i=1}^N \nabla Q_\phi(s_i,a_i) \left( Q_\phi (s_i, a_i) - \left[ r(s_i, a_i) + \gamma \max_{a'} Q_{\phi'} (s_i', a')\right]\right)
        $$
        
        …where $Q_{\phi'}$ is the frozen target network. The inner loop is doing *supervised learning*.
        
    3. Get policy:
        
        $$
        \pi(a_t \mid s_t) = \begin{cases} 
        1 & \text{if }\ a_t = \argmax_a Q_\phi(s_t, a) \\
        0 & \text{otherwise}
        \end{cases}
        $$
        
3. Repeat step 0.

#### Double Q Networks

**Fix problem 2:** Use two $Q$ networks —

$$
Q_{\phi_A}(s,a) \leftarrow r + \gamma Q_{\phi_B}(s', \argmax_{a'}Q_{\phi_A}(s', a')) \\
Q_{\phi_B}(s,a) \leftarrow r + \gamma Q_{\phi_A}(s', \argmax_{a'}Q_{\phi_B}(s', a'))
$$

- Network $A$ is used to *select action* — $\argmax_{a'}Q_{\phi_A}(s', a'))$
- Network $B$ is used to *evaluate action* — $\gamma Q_{\phi_B}(\dots)$

**Intuition:** separate action selection from action evaluation to decorrelate noise.

Do not let the same noisy estimate 1) choose the best action *and* 2) judge the action.

> Typically, the second $Q$ network is the *target* $Q$ network — i.e., a delayed copy of $Q$.
> 

# Offline RL

**Goal:** Train the policy on a static, offline dataset — without collecting new data.

Given a static dataset $\mathcal{D}: \{(s, a, s', r)\}$ collected by unknown (mixture of) policies $\pi_\beta$, maximize expected rewards under learned poliyc $\pi_\theta$:

$$
\max_\theta \mathbb{E}_{p_{\pi_\theta}(\tau)} \left[ \sum_t r(s_t, a_t)\right]
$$

> Why not use imitation learning?
> 

Imitation learning assumes collected data is ‘expert’ data (does not use rewards).

We can’t assume all trajectories in $\mathcal{D}$ are good.

What if we filter to the top-$k$ reward actions?

Removes valuable signal — we still want to learn from bad actions. 

Imitation learning can’t outperform the behavior policy.

RL can *stitch together* good behaviors across trajectories.

**Challenge: Overestimation.**

> Why can’t we use an off-policy algorithm (Q-learning, SAC) out-of-the-box?
> 

The offline data support is only a *small fraction* of the action space.

The policy will seek actions that are *overestimated* by $Q$.
There is no new feedback to correct this overestimation!

If actions taken by $\pi_\theta$ deviate too far from $\pi_\beta$, value estimates become noisy — leading to compounding overestimation.

Can we constrain the action space to be *close* to $\pi_\beta$?

## Advantage-Weighted Regression

**Idea:** Weight each transition based on the advantage of the action.

Weighted imitation learning update (like actor-critic policy gradient):

$$
\max_\theta \mathbb{E}_{(s_t, a_t) \sim \mathcal{D}} \left[ \log \pi_\theta (a_t | s_t) \exp\left(\frac{1}{\alpha} \hat{A}^{\pi_\beta}(s_t,a_t)\right)\right]
$$

> Why do we exponentiate, and weight by temperature $1/\alpha$?
> 
- Exponentiation — ensures nonnegative weights; prevents unstable learning (without it, we might push log-probability toward $-\infty$).
- Temperature — controls conservativeness, how much we contrast good vs. bad actions
    - high $\alpha$ → conservative, low variance — close to imitation learning
    - low $\alpha$ →  aggressive, high variance — closer to greedy improvement

Fit a value function using Monte Carlo:

$$
\min_\phi \sum_{s_t \sim \mathcal{D}} \left \lVert \hat{V}_\phi^{\pi_\beta} (s_t) - \sum_{t'=t}^T r(s_t, a_t)\right \rVert ^2
$$

**Tradeoffs:**

- + Simple, avoids querying/training on OOD actions
    - Selects among demonstrated actions, preferring high-advantage actions
- - Monte Carlo estimation is noisy
- - Learns $\hat{A}^{\pi_\beta}$, reflecting the weaker behavior policy, instead of $\hat{A}^{\pi_\theta}$ for the current policy

## Implicit Q-Learning

**Idea:** Without querying OOD actions, fit an *upper expectile* of the data distribution.

Imitation learning (L2 loss) simply learns the *mean* behavior of dataset actions:

$$
V_\text{L2}(s) \approx \mathbb{E}_{a \sim \pi_\beta(\cdot|s)}[Q(s,a)]
$$

To do better, we fit an upper expectile. 
This is an estimate of the $Q$-value maximizing action in the dataset:

$$
V_\text{expectile}(s) \approx \max_{a \in \text{supp}(\mathcal{D}(\cdot | s))} Q(s,a)
$$

#### Expectile Regression

The expectile loss $\mathcal{L}^\lambda_2$ for hyperparameter $\lambda$ is defined as:

$$
\mathcal{L}_2^\lambda(x) = \begin{cases} 
(1-\lambda)x^2 & \text{if }\ x < 0\\
\lambda x^2 & \text{otherwise}
\end{cases}
$$

When $\lambda = 0.5$, this is simply the L2 loss.

- When $\lambda < 0.5$, we strongly penalize *negative* values of $x$.
- When $\lambda > 0.5$, we strongly penalize *positive* values of $x$.

**Step 1:** We learn $V(s)$ using an upper expectile:

$$
\hat{V}(s) \leftarrow \argmin_V \mathbb{E}_{(s,a)\sim\mathcal{D}} \left[ \mathcal{L}_2^\lambda (Q(s,a) - V(s)) \right], \quad \lambda > 0.5
$$

- $\lambda < 0.5$ — penalize $Q(s,a) < V(s)$, more conservative.
Bias $V(s)$ toward a lower expectile of $Q$.
- $\lambda > 0.5$ — penalize $Q(s,a) > V(s)$, more aggressive.
Bias $V(s)$ upwards toward an upper expectile of $Q$.

Higher $\lambda$ → more bias toward higher expectile (closer to maximum in-dataset action).

**Step 2:** We learn $Q(s,a)$ using MSE:

$$
\hat{Q}(s,a) \leftarrow \argmin_Q \mathbb{E}_{(s,a,s') \sim \mathcal{D}} \left[(Q(s,a) - (r + \gamma \hat{V}(s')))^2 \right]
$$

“If I take dataset action $a$ at state $s$, then follow the *implicit* improved policy, what is the return?”

This is a Bellman update that *backs up* the value by one step.

> Why use MSE loss?
> 

Ensures that we average over randomness in state dynamics.

Control for random dynamics — don’t bias toward lucky state transitions.

**Step 3:** Extract policy $\pi$ using AWR:

$$
\hat{\pi} \leftarrow \argmax_\pi \mathbb{E}_{(s,a) \sim \mathcal{D}} \left[ \log \pi(a|s) \exp \left( \frac{1}{\alpha}(\hat{Q}(s,a) - \hat{V}(s)) \right)\right]
$$

**Intuition:**

- $V$ extracts good in-dataset actions from $Q$
- $Q$ backs that value one step via a Bellman update
- $\pi$ is extracted via weighting actions by advantage $Q - V$

# Reward Learning

What if the environment doesn’t provide clear rewards?

**Goal:** Can we *learn* a reward function, based on reward examples?

## Goal Classifiers

**Idea:** Learn to discern *goal states* from other states using binary classifier.

Given dataset of successful (reward 1) and unsuccessful (reward 0) states.

**Algorithm:**

1. Collect examples $\{s_i\}$ inside and outside of goal set $\mathcal{G}$
2. Train classifier $r_\psi(s)$ with inputs $s_i$ and labels $1(s_i \in \mathcal{G})$
3. Run RL using $r_\psi$ as the reward function.

**Problems:**

- Reward-hacking: policy will exploit classifier’s inaccuracies (overestimated states)
- Policy may query classifier on OOD states

#### Adversarial Training

**Trick:** Add states that the policy visits as *negative examples* for the classifier.

Take all the states that $\pi_\theta$ visits, and *blindly label them as unsuccessful* for the classifier.

**Algorithm:**

1. Collect initial set of successful states $\mathcal{D}_+$ and unsuccessful states $\mathcal{D}_-$
2. Train classifier $r_\psi$ using $\mathcal{D}_+$ and $\mathcal{D}_-$ using a *balanced batch*, i.e., 50/50 of each label
3. Collect rollout $(s_t, a_t)$ using policy $\pi_\theta$
4. Update policy $\pi_\theta$ based on rewards from $r_\psi$
5. Add all visited states to the *negative set*: $\mathcal{D}_- \leftarrow \mathcal{D}_- \cup \{s_t\}$
6. Repeat step 1

**Intuition:** Why does this work?

The classifier’s reward objective:

$$
\max_\psi \sum_{s \sim \mathcal{D}_+} r_\psi(+ \mid s) + \sum_{s \sim \mathcal{D}_-} r_\psi(- \mid s)
$$

By using *balanced batches*, $r_\psi$ assigns a probability of *at least* 50% to true positives.

- true positive appears in both sets (we mislabeled) → $p = 0.5$
- true positive appears in just the positive set (we didn’t mislabel) → $p = 1.0$

For true negatives, $r_\psi$ always assigns a probability of $p = 0.0$.

We are *conservative* — we depend on provided goal states as the sole positive rewards.

## RLHF

Reward classifiers require examples of desired behavior/outcomes.

**Idea:** *Relative preferences* are easy to collect.

Collect a dataset $\mathcal{D}$ of trajectory pairs $\{(\tau_{w}, \tau_{l})_i\}$.

Objective — train classifier $r_\psi$ that has higher reward for *preferred* trajectory.

Maximize log probability of $p(\tau_w \succ \tau_l) \approx \sigma\left(r_\psi(\tau_w) - r_\psi(\tau_l)\right)$:

$$
\max_\psi \mathbb{E}_{\tau_w, \tau_l} \left[ \log \sigma (r_\psi (\tau_w) - r_\psi (\tau_l))\right]
$$

**Algorithm:**

1. Given dataset $\{\tau_i\}$, sample batches of $k$ trajectories and ask humans to rank.
2. Compute $r_\psi(\tau_1), \dots, r_\psi(\tau_k)$ under current reward model $r_\psi$
3. For all $k \choose 2$ pairs per batch, compute gradient:
    
    $$
    \nabla_\theta \mathbb{E}_{\tau_w, \tau_l} \left[ \log \sigma (r_\psi (\tau_w) - r_\psi (\tau_l))\right], \quad \text{where } \tau_w \succ \tau_l
    $$
    
4. Update $\theta$ using computed gradient and repeat.

> Note — this assumes transitivity, i.e., $\tau_a \succ \tau_b \text{ and } \tau_b \succ \tau_c \implies \tau_a \succ \tau_c$.
Requires some domain knowledge about reward function.
> 

# Model-based RL

Can we learn a model of the world dynamics $p_\theta (s_{t+1} \mid s_t, a_t)$?

Predict how the world dynamics will behave based on the current state and action.

> Why does a dynamics model help?
> 
- Data efficiency: supplement *real* policy roll-outs with *synthetic* roll-outs.
- Planning: simulate synthetic trajectories for *more direct* value estimation.

## Model-based Policy Optimization

**Idea:** Train simulator *while* training the policy, using simulator’s data to augment actual roll-outs.

**Algorithm:**

- Collect data using current policy $\pi_\phi$, add to $\mathcal{D}_{\text{env}}$
- Update simulator $p_\theta(s_{t+1} \mid s_t, a_t)$ using $\mathcal{D}_{\text{env}}$
- Collect synthetic roll outs using $\pi_\phi$ inside of simulator $p_\theta$, add to $\mathcal{D}_{\text{model}}$:
    - Simulate a trajectory:
        - query policy: $a \leftarrow \pi(\cdot \mid s)$
        - query simulator: $s' \leftarrow p_\theta (\cdot \mid s, a)$
        - query policy: $a \leftarrow \pi(\cdot \mid s')$
        - …
- Update $\pi_\phi$ (and critic $Q$) using augmented dataset $\mathcal{D}_{\text{env}} \bigcup \mathcal{D}_{\text{model}}$

**Problems:**

- Long trajectories amplify errors (simulator may not be accurate over many timesteps)
- Reward-hacking: policy will seek out lucky (overestimated) state transitions

#### Partial Trajectories

**Trick 1:** Generate *partial trajectories* from *all states* in the data.

- Simulate short partial trajectories — e.g., 1-10 steps.
→ Shorter horizons, less compounding of errors.
- Randomly select initial states amongst all states in data.
    
    → Better coverage of state space.
    

#### Model Ensembles

**Trick 2:** Use ensemble of simulator models.

- Train multiple (decorrelated) simulators, use different random mini-batches to train each.
    
    → Errors average out, harder to exploit (cover each other’s holes).
    

#### Algorithm

**Algorithm**

1. Collect data using current policy $\pi_\phi$, add to $\mathcal{D}_{\text{env}}$
2. Update *ensemble of simulators* $p^i_\theta(s_{t+1} \mid s_t, a_t)$ using minibatch $B^i$ sampled from $\mathcal{D}_{\text{env}}$
3. Collect *partial rollouts* using $\pi_\phi$ inside simulator $p^i_\theta$ starting from initial state $s \in \mathcal{D}_{\text{env}}$ and add to $\mathcal{D}_{\text{model}}$
4. Update $\pi_\phi$ (and critic $Q$) using augmented dataset $\mathcal{D}_{\text{env}} \bigcup \mathcal{D}_{\text{model}}$

## Test-time Planning

Simulator can be used for planning:

1. Consider some sequence of actions.
2. Simulate the outcome of each action sequence.
3. Pick the action with the best simulated outcome.

Idea: no policy — just execute the simulated trajectory with highest rewards.

**Algorithm:**

1. Sample $i = 1 \dots N$ action sequences $a_{t:t+H}^i$
2. Generate next states $\hat{s}^i_{t+1 \ : \ t + H + 1}$ by rolling out actions inside simulator $p_\theta$
3. Evaluate the sum of rewards of the trajectory:
    
    $$
    \sum_{t'=t}^{t+H} r(\hat{s}^i_{t'}, \ a_{t'}^i)
    $$
    
4. Execute the trajectory with highest rewards:
    
    $$
    i^* \leftarrow \argmax_i \sum_{t'=t} ^{t+H} r(\hat{s}_{t'}^i ,\ a_{t'}^i)
    $$
    

> Note: execute *only* $a_t^{i*}$, i.e., the first action, and then replan at $s_{t+1}$.
Receding horizon planning — we plan for a longer sequence than the actually executed action horizon.
> 

**Intuition:** 

- In $Q$-learning, we learn a *model* of the value of different actions, and greedily select the best action.
- In planning, we are using *much more compute* to actually look at many different action trajectories, but using a model of the world to simulate them.

$Q$-learning is trying to *learn* the answer to the planning problem directly, whereas planning is like *computing* the $Q$-value quantities on-the-fly.

**Problem:** requires accurate long-horizon simulator + substantial inference compute.

Short horizons $H$ — myopic planning, less potential lookahead.
Long horizons $H$ — compounding errors, higher inference compute

#### Long-horizon Planning

**Idea:** Learn a value function $V(s)$ for hybrid Monte Carlo + bootstrap.

- Take $n$-step Monte Carlo estimate simulated by planner
- Estimate value of remainder of trajectory using $V(s)$

**Algorithm:**

$$
i^* \leftarrow \argmax_i \sum_{t'=t} ^{t+H} r(\hat{s}_{t'}^i ,\ a_{t'}^i) + \hat{V}(\hat{s}_{t+H+1})
$$

1. Collect data using current planner and simulator $p_\theta$, add to $\mathcal{D}_{\text{env}}$
    
    To collect data using the planner/simulator:
    
    1. Sample $i = 1 \dots N$ action sequences $a_{t:t+H}^i$
    2. Generate next states $\hat{s}^i_{t+1 \ : \ t + H + 1}$ by rolling out actions inside simulator $p_\theta$
    3. Evaluate the sum of rewards of the trajectory:
        
        $$
        \sum_{t'=t}^{t+H} r(\hat{s}^i_{t'}, \ a_{t'}^i) + \hat{V}(\hat{s}_{t+H+1})
        $$
        
    4. Execute the action with highest rewards using learned value function:
        
        $$
        i^* \leftarrow \argmax_i \sum_{t'=t} ^{t+H} r(\hat{s}_{t'}^i ,\ a_{t'}^i) + \hat{V}(\hat{s}_{t+H+1})
        $$
        
    5. Observe the **real reward and next state** from the environment, add to $\mathcal{D}_\text{env}$
2. Update simulator $p_\theta(s_{t+1} \mid s_t, a_t)$ using $\mathcal{D}_{\text{env}}$
3. Update value function $\hat{V}_\psi$ using Monte Carlo / TD learning using $\mathcal{D}_\text{env}$
4. Optionally if using a policy to generate actions, update $\pi_\phi$ using $\mathcal{D}_\text{env}$

## Tradeoffs

**Pros:**

- Simulator can be very useful and far more data efficient *if* the model is easy to learn
- Simulator can be trained on data *without* reward labels (fully self-supervised)
- Simulator is somewhat task-agnostic (can be used for tasks with different rewards if states/dynamics are the same)

**Cons:**

- Simulators don’t optimize for task performance
    - How well we can model the environment ≠ how well we can complete a task
    - Simulator may be capture irrelevant details
- Simulator can be hard to train (high-dimensional / difficult to collect data)
- Another thing to train — more hyperparameters, more compute

# Multi-task RL

How can we share *weights* and *data* across multiple tasks for learning efficiency?

**Goal:** Train a generalist policy that can perform multiple tasks.

Each task is a different MDP:

$$
\mathcal{T_i} = \{S_i,\ A_i, p_i(s_1),\ p_i(s' | s, a),\ r_i(s,a)\}
$$

## Task Conditioning

How can we share weights across tasks?

**Idea:** Use a task identifier $z_i$ for each task, included as part of state $s$.

Can be integer index, language description, demonstration video, etc.

#### Goal-conditioned RL

Use the **desired goal state** as the task identifier: $z_i = s_g$.

Reward for goal-conditioned RL:

$$
r(s) = r(\bar{s}, s_g) = -d(\bar{s}, s_g)
$$

- $d(\cdot, s_g)$ — distance function between given state and goal state

Train policy $\pi(a \mid s, s_g)$ with goal states as part of input. 

Distance function can be better than sparse rewards — define some ‘partial rewards’ relative to goal state for more reward signal.

No need to define reward — can be self-supervised (purely distance in state-space).

#### Stratified Sampling

**Trick:** Store replay buffer of *per-task* data.

Construct each mini-batch for the policy with *equal data* from each task.

→ Lower variance gradients — each task is represented equally for every gradient update.

## Hindsight Relabeling

How can we share data across **tasks?

**Idea:** For each trajectory, relabel the sample for a different task under a *different reward*.

Note — requires identical dynamics / state space across different tasks.

**Algorithm:**

For task $i$, iteration $k$:

1. Collect data $\mathcal{D}_k = \{\left( s_{1:T},\ a_{1:t},\ z_i,\ r_{1:T}\right)\}$ using policy $\pi_\theta$
2. Store data in replay buffer $\mathcal{D} \leftarrow \mathcal{D} \ \cup \ \mathcal{D}_k$
3. Perform hindsight relabeling:
    1. Relabel experience in $\mathcal{D}_k$ for task $\mathcal{T}_j$:
        
        $$
        \mathcal{D}_k' = \mathcal{D}_k = \{\left( s_{1:T},\ a_{1:t},\ z_j,\ r'_{1:T}\right)\} \quad \text{where } r_t' = r_j(s_t)
        $$
        
    2. Store relabeled data in replay buffer $\mathcal{D} \leftarrow \mathcal{D} \ \cup \ \mathcal{D}_k'$
4. Update $\pi_\theta$ using replay buffer $\mathcal{D}$

Which task $\mathcal{T}_j$ should we relabel for?

Choose task in which trajectory gets highest reward.

#### Goal-conditioned Hindsight Relabeling

To relabel, define reward using distance from goal:

$$
\mathcal{D}_k' = \mathcal{D}_k = \{\left( s_{1:T},\ a_{1:t},\ z_j,\ r_{1:T}\right)\} \quad \text{where } r_t' = -d(s_t, s_g)
$$

Alternatively, we can sample and relabel using *any future state* from the trajectory.

For a given state transition, we define a **new goal**, defined as a randomly sampled future state in that trajectory. 

- Sample some future timestep index $t_f \in \{t+1, \dots, T\}$
- Define the hidnsight goal as that future state $z_j = s_{t_f}$
- Store relabeled sample $\left( s_t,\ a_t\ s_{t_i},\ r'_t\right), \text{ where } r'_t = -d(s_t, s_{t_f})$

Thus, we end up with two samples:

1. The original sample for task $\mathcal{T}_i$ — $\{\left( s_t,\ a_t,\ z_i,\ r_t\right)\}$
2. The new sample for task $\mathcal{T}_j$ — $\{\left( s_t,\ a_t,\ z_j,\ r_t'\right)\}$

Essentially, we generate synthetic goals on-the-fly from the trajectory itself.

**Intuition:** Creates dense learning signal — for a failed trajectory on one goal, episode can still be replayed as signal for a different goal.
