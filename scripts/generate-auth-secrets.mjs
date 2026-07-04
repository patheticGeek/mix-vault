#!/usr/bin/env node
// Generates the credentials needed for JWT + bcrypt auth:
//   - a bcrypt password hash (the salt is generated and embedded in the hash itself)
//   - a random JWT signing secret
//
// Usage:
//   node scripts/generate-auth-secrets.mjs <username> <password>
//   node scripts/generate-auth-secrets.mjs            (prompts interactively, password hidden)

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET_BYTES = 32;

const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);
const BACKSPACE = String.fromCharCode(127);

// Reads a sequence of lines from stdin, one per field, masking input for
// fields marked `hidden`. All fields share a single stdin listener so that
// bytes typed (or pasted) ahead of the current prompt aren't dropped when
// moving on to the next field.
function promptFields(fields) {
	return new Promise((resolve) => {
		if (fields.length === 0) {
			resolve([]);
			return;
		}

		const values = fields.map(() => "");
		let fieldIndex = 0;
		stdout.write(fields[0].label);

		if (!stdin.isTTY) {
			// No TTY to put in raw mode (e.g. piped input) — fall back to plain,
			// unmasked line reads.
			const rl = createInterface({ input: stdin, output: stdout, terminal: false });
			(async () => {
				for (; fieldIndex < fields.length; fieldIndex++) {
					if (fieldIndex > 0) stdout.write(fields[fieldIndex].label);
					values[fieldIndex] = await rl.question("");
				}
				rl.close();
				resolve(values);
			})();
			return;
		}

		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		const onData = (chunk) => {
			for (const char of chunk) {
				switch (char) {
					case "\n":
					case "\r":
					case CTRL_D:
						stdout.write("\n");
						fieldIndex++;
						if (fieldIndex >= fields.length) {
							stdin.setRawMode(false);
							stdin.pause();
							stdin.removeListener("data", onData);
							resolve(values);
							return;
						}
						stdout.write(fields[fieldIndex].label);
						break;
					case CTRL_C:
						stdout.write("\n");
						process.exit(1);
						return;
					case BACKSPACE:
					case "\b":
						if (values[fieldIndex].length > 0) {
							values[fieldIndex] = values[fieldIndex].slice(0, -1);
							stdout.write("\b \b");
						}
						break;
					default:
						values[fieldIndex] += char;
						stdout.write(fields[fieldIndex].hidden ? "*" : char);
						break;
				}
			}
		};
		stdin.on("data", onData);
	});
}

async function main() {
	let [username, password] = process.argv.slice(2);

	const missing = [];
	if (!username) missing.push({ key: "username", label: "Username: ", hidden: false });
	if (!password) missing.push({ key: "password", label: "Password: ", hidden: true });

	if (missing.length > 0) {
		const values = await promptFields(missing);
		missing.forEach((field, i) => {
			if (field.key === "username") username = values[i];
			else password = values[i];
		});
	}

	if (!username?.trim() || !password?.trim()) {
		console.error("Both a username and password are required.");
		process.exit(1);
	}

	// bcrypt.genSalt generates and embeds a fresh random salt in the resulting
	// hash, so no separate salt needs to be stored alongside it.
	const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
	const passwordHash = await bcrypt.hash(password, salt);
	const jwtSecret = randomBytes(JWT_SECRET_BYTES).toString("hex");

	console.log("\nAdd these to .dev.vars for local development:\n");
	console.log(`AUTH_USERNAME=${username}`);
	console.log(`AUTH_PASSWORD_HASH=${passwordHash}`);
	console.log(`JWT_SECRET=${jwtSecret}`);
	console.log("\nFor production, set them as Worker secrets instead:\n");
	console.log("npx wrangler secret put AUTH_USERNAME");
	console.log("npx wrangler secret put AUTH_PASSWORD_HASH");
	console.log("npx wrangler secret put JWT_SECRET");
	console.log("");

	// Reading raw keystrokes from a TTY (for the hidden password prompt) can leave
	// the process referenced even after pausing stdin, so exit explicitly.
	process.exit(0);
}

main();
