import flexRoute from "../src";

const app = flexRoute("./routes");

const get = () => {
	return app
		.fetchRoute("/user/123 ok?type=1", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		})
		.then((res) => {
			console.log(res);
			console.log();
		});
};

app.ready().then(async () => {
	await get();
});
