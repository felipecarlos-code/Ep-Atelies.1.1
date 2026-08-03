async function test() {
  const res = await fetch('http://localhost:3000/api/drive/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: 'dummy_token',
      searchQuery: 'test',
      folderId: ''
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
