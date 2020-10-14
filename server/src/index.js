const express = require('express');
const axios = require('axios');
const  { spawn } = require('child_process');

const port = process.env.NETILFY_GITHUB_OAUTH2_PORT || process.env.PORT
const client_id = process.env.NETILFY_GITHUB_OAUTH2_CLIENT_ID;
const client_secret = process.env.NETILFY_GITHUB_OAUTH2_CLIENT_SECRET;
const authUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=repo,user`;
const tokenUrl = 'https://github.com/login/oauth/access_token';
const deployScript = process.env.NETILFY_GITHUB_DEPLOY_SCRIPT;

const app = express();
app.use(express.json());

// NetlifyCMS begins oauth2 grant flow here
app.get('/auth', (req, res) => res.redirect(authUrl));

// GitHub callback redirects here with grant code
app.get('/auth/callback', async (req, res) => {
  try {
		// Exchange grant code for access token
    const { data } = await axios.post(
      tokenUrl,
      { code: req.query.code, client_id, client_secret },
      { headers: { Accept: 'application/json' } },
    );
	const credentials = { token: data.access_token, provider: 'github' };
	// Response page uses postMessage to forward creditials to NetlifyCMS
	const script = `<!DOCTYPE html>
<html>
	<head>
		<script>
			if (false && !window.opener) {
 				window.opener = {
					postMessage: function(action, origin) {
					console.log(action, origin);
					}
				}
			}

			(function() {
				console.log('registering: ');
				function postCredentials(e) {
					window.opener.postMessage('authorization:github:success:${JSON.stringify(credentials)}', e.origin);
				}

				window.addEventListener('message', postCredentials, false);
				window.opener.postMessage('authorizing:github', '*');
			})()
		</script>
	</head>
	<body style='color: #798291; background-color: #eff0f4; margin: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-weight: normal;'>
		<h2>Netlify-GitHub Login</h2>
		<h4>Authorizing ...</h4>
	</body>
</html>
`
	return res.send(script);
  } catch (err) {
	console.error('error:', err);
	res.redirect('/?error=Authentication%20Failure');
 }
});

// GitHub webhook responder notified on repo push 
app.post("/gatsby/deploy", (req, res) => {
	try {
		const { body } = req;

		const deploy = spawn(deployScript, [JSON.stringify(body)]);

		deploy.stdout.on('data', (data) => {
			console.log(`gatsby-deploy: ${data}`);
		});

		deploy.stderr.on('data', (data) => {
			console.error(`gatsby-deploy: ${data}`);
		});

		deploy.on('close', (code) => {
			console.log(`gatsby-deploy: exited with code ${code}`);
		});
		
		deploy.unref();
		res.status(200).end();

	} catch (err) {
		console.error('error:', err);
	}
});

console.log('Netlify-GitHub Listinging on: ', port);
app.listen(port);
