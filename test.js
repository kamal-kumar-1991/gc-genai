const { spawn } = require('child_process');

const scrapeURL = (url) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', ['test.py']); // Adjust to 'python' if needed for your system

    let htmlData = '';
    let errorData = '';

    // Send URL to Python's stdin
    pythonProcess.stdin.write(url);
    pythonProcess.stdin.end();

    // Collect data from Python's stdout
    pythonProcess.stdout.on('data', (data) => {
      htmlData += data.toString(); // Accumulate data in case of multiple chunks
    });

    // Collect errors from Python's stderr
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Handle process exit
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        if (htmlData.trim()) {
          resolve(htmlData);
        } else {
          reject(new Error('No data received from Python script.'));
        }
      } else {
        reject(new Error(`Python script exited with code ${code}: ${errorData}`));
      }
    });

    // Handle unexpected process errors
    pythonProcess.on('error', (err) => {
      reject(new Error(`Error spawning Python process: ${err.message}`));
    });
  });
};

module.exports = { scrapeURL };