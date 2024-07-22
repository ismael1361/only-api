import flexRoute from "../src";

const app = flexRoute("./routes");

const get = () => {
	app.fetchRoute("/user/123 ok?type=1", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	}).then((res) => {
		console.log(res);
	});
};

app.ready().then(() => {
	get();
	get();
	get();
	get();
});
