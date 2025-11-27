module.exports = {
  bumpFiles: [
    {
      filename: 'package.json',
      type: 'json'
    },
    {
      filename: 'manifest.json',
      type: 'json'
    }
  ],
  skip: {
    changelog: true
  }
};
