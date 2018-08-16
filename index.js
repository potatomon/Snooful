require("dotenv").config();

const debug = require("debug");
const log = {
	main: debug("snooful:main"),
	events: debug("snooful:events"),
	commands: debug("snooful:commands"),
};

const version = require("./package.json").version;

/*const Snoowrap = require("snoowrap");
const sr = new Snoowrap({
	userAgent: `Snooful v${version}`,
	clientId: process.env["SNOOFUL_CLIENT_ID"],
	clientSecret: process.env["SNOOFUL_CLIENT_SECRET"],
	refreshToken: process.env["SNOOFUL_TOKEN"],
});*/

/**
 * The prefix required by commands to be considered by the bot.
 */
const prefix = process.env.SNOOFUL_PREFIX || "!";

const yargs = require("yargs");
yargs.commandDir("commands", {
	recurse: true,
});

/**
 * Logs an end user-initiated fail (non-interrupting) to console.
 */
function safeFail() {
    return debug("Someone or something failed. This might not be bad.\n");
}
yargs.fail(safeFail);
yargs.exitProcess(false);

yargs.help(false);
yargs.version(false);

/**
 * The client information.
 */
let clientInfo = {};

/**
 * Runs a command.
 * @param {string} command The command to run, including prefix.
 */
function handleCommand(command = "", channel = {}, message = {}) {
	if (command.startsWith(prefix) && message._sender.nickname !== clientInfo.nickname) {
		const unprefixedCmd = command.replace(prefix, "");
		log.commands("recieved command %s", unprefixedCmd);

		try {
			yargs.parse(unprefixedCmd, {
				prefix,
				channel,
				message,
				client,
				sb,
				sr,
				version,
				send: message => {
					channel.sendUserMessage(message, () => {});
				},
				usage: yargs.getUsageInstance().getCommands(),
				log: log.commands,
			});
		} catch {
			safeFail();
		}
	}
}

const Sendbird = require("sendbird");
const sb = new Sendbird({
	appId: "2515BDA8-9D3A-47CF-9325-330BC37ADA13" // reddit chat!!
});

log.main("connecting to sendbird");
sb.connect(process.env["SNOOFUL_ID"], process.env["SNOOFUL_TOKEN"], (userInfo, error) => {
	if (error) {
		log.main("couldn't connect to sendbird");
	} else {
		log.main("connected to sendbird");
		client = userInfo;
	}
});

const handler = new sb.ChannelHandler();

handler.onMessageReceived = (channel, message) => handleCommand(message.message, channel, message);
handler.onUserReceivedInvitation = (channel, inviter, invitees) => {
	if (invitees.map(invitee => invitee.nickname).includes(client.username)) {
		// i have been invited to channel, let's join and send an introductory message!
		log.events("invited to channel");
		channel.join(() => {
			log.events("automatically joined channel via invitation");
			channel.sendUserMessage(`Thanks for inviting me to this channnel, u/${inviter.nickname}! I'm u/${client.nickname}, your friendly bot asssistant.`, () => {
				log.events("sent introductory message");
			});
		});
	}
}

sb.addChannelHandler("handler", handler);