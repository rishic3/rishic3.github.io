// add-template-script.js
const fs = require('fs');
const path = require('path');

// Path to your HTML file(s)
// You can modify this to process multiple files using glob patterns
const targetFile = process.argv[2]; // Pass the file path as a command-line argument

if (!targetFile) {
  console.error('Please provide a target HTML file path');
  process.exit(1);
}

// Read the file
fs.readFile(targetFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading file: ${err}`);
    return;
  }

  // Check if script is already added
  if (data.includes("notes-template.js")) {
    console.log('Script tag already exists in the file');
    
    // Remove the script from the end of the body if it exists
    let modifiedData = data;
    if (data.includes('<script src="../../../js/notes-template.js"></script></body>')) {
      modifiedData = data.replace(
        '<script src="../../../js/notes-template.js"></script></body>',
        '</body>'
      );
      
      // Add the script to the head if it's not already there
      if (!modifiedData.includes('<script defer src="../../../js/notes-template.js"></script>')) {
        modifiedData = modifiedData.replace(
          '</head>',
          '<script defer src="../../../js/notes-template.js"></script></head>'
        );
        
        // Write the modified content back to the file
        fs.writeFile(targetFile, modifiedData, 'utf8', (err) => {
          if (err) {
            console.error(`Error writing file: ${err}`);
            return;
          }
          console.log(`Successfully moved template script to head in ${targetFile}`);
        });
      }
    }
    return;
  }

  // Add the script to the head section with defer attribute
  const modifiedData = data.replace(
    '</head>',
    '<script defer src="../../../js/notes-template.js"></script></head>'
  );

  // Write the modified content back to the file
  fs.writeFile(targetFile, modifiedData, 'utf8', (err) => {
    if (err) {
      console.error(`Error writing file: ${err}`);
      return;
    }
    console.log(`Successfully added template script to ${targetFile}`);
  });
});