import flexRoute from "../src";

const app = flexRoute("./routes");

app.ready().then(() => {
	app.fetchRoute("/user/123?type=1", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	}).then((res) => {
		console.log(res);
	});
});
