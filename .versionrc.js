module.exports = {
  bumpFiles: [
    {
      filename: 'package.json',
      type: 'json'
    },
    {
      filename: 'extension/manifest.json',
      type: 'json'
    }
  ],
  skip: {
    changelog: true
  }
};
