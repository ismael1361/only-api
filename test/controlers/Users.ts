const UUID = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0,
			v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

console.log(UUID());

let count = 0;

export default class Users {
	static async index() {
		return UUID();
	}
	static async show(id: string) {
		count++;
		return console.log(id + ` (${count}) ` + "-" + new Date().toISOString());
	}
}
