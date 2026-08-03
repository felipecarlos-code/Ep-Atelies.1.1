async function test() {
  const res = await fetch('http://localhost:3000/api/nps/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'test' }]
    })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
