const response = await fetch("https://www.googleapis.com/drive/v3/drives?pageSize=1000", {
    headers: { Authorization: `Bearer invalid_token` }
});
console.log(response.status);
const text = await response.text();
console.log(text);
