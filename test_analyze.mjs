async function test() {
  const res = await fetch('http://localhost:3000/api/drive/analyze-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: 'dummy_token',
      fileId: 'dummy_file',
      mimeType: 'text/plain',
      fileName: 'test.txt'
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
