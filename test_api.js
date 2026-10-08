const fs = require('fs');

async function testApi() {
	const res = await fetch('http://localhost:8080/api/v1/platform/tenants');
	console.log(res.status);
}

testApi();
