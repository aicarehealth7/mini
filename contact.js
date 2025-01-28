document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;



  const docClient = new AWS.DynamoDB.DocumentClient();

  // Parameters for DynamoDB
  const params = {
    TableName: 'ContactMessages', // Replace with your table name
    Item: {
      ContactID: Date.now().toString(), // Unique ID for each message
      Name: name,
      Email: email,
      Subject: subject,
      Message: message,
      Timestamp: new Date().toISOString(),
    },
  };

  // Save to DynamoDB
  try {
    await docClient.put(params).promise();
    alert('Your message has been sent successfully!');
    document.getElementById('contact-form').reset();
  } catch (error) {
    console.error('Error saving message to DynamoDB', error);
    alert('An error occurred. Please try again.');
  }
});
