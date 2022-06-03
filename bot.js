const Discord = require("discord.js");
const { response } = require("express");
const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"], ws: { properties: { $browser: "Discord iOS" }}})
const redis = require("redis")
const math = require('mathjs')
const botconfig = require('./config.json');
let redis_client

const token = botconfig.token
const commands = ["help", "startcount", "count", "resetcount"]
const prefix = botconfig.prefix

//Start redis
async function run_redis() {
    redis_client = redis.createClient({url: botconfig.redis_key})
    await redis_client.connect()
}

client.on('ready', () => { 

    console.log('Bot is running!')
    
    //Bot Activity
    client.user.setPresence({ 
        activities: [
            { name: `${prefix}help`
            , type: 'PLAYING' 
        }], status: 'online'
    });

})

//Messages function
client.on("messageCreate", async (message) => {

    //if (message.author.id == client.user.id) return;
    if (message.author.bot) return;

    msg = message.content.toLowerCase();

    const [CMD_NAME, ...args] = msg
    .trim()
    .toLowerCase()
    .split(/\s+/);

    //Command Executor
    if (msg.startsWith(prefix)) {
        const commandsent = CMD_NAME.replace(`${prefix}`, "")
        command(commandsent, message, args)
    }

    let numval = await redis_client.get(`${message.channel.id}-count`)
    let useval = await redis_client.get(`${message.channel.id}-lastuser`)
    if (numval != null) {
        if (parseInt(msg)) {
            if (math.evaluate(msg) == Number(numval)+1 && Number(useval) != Number(message.member.id)) {
                redis_client.set(`${message.channel.id}-count`, math.evaluate(msg));
                redis_client.set(`${message.channel.id}-lastuser`, Number(message.member.id));
                message.react("✅")
            } else {
                message.react("❌")
                setTimeout(() => message.delete(), 30000)
            }
        } else {
            if (msg.startsWith(prefix)) return;
            message.react("❌")
            setTimeout(() => message.delete(), 30000)
        }
    }
})

//Command Handler
async function command(command, message, args) {
    if (!commands.includes(command)) return message.channel.send("Command doesn't exist | الأمر غير موجود")

    if (command == "help") {
        const botHelpMenu = new Discord.MessageEmbed().setColor('RANDOM').setTitle(`Help Menu | قائمة المساعدة`).setThumbnail('https://c.tenor.com/jUMex_rdqPwAAAAM/among-us-twerk.gif?size=256').addFields(
        { name: `${prefix}help`, value: 'Shows the help menu | اظهار قائمة المساعدة' },
        { name: `${prefix}startcount/resetcount (Channel ID)`, value: 'Sets counting channel | اختيار/اعادة قناة العد' },
        { name: `${prefix}count ~~(Channel ID)~~`, value: 'Shows current current number | اظهار اخر رقم' },
        //{ name: `${prefix}code`, value: 'Private messages user the source code | يراسل الشخص برابط الكود' },
        //{ name: `${prefix}invite`, value: `Private messages user the bot's invite link | يراسل الشخص برابط البوت` },
        ).setFooter(`Requested by ${message.author.tag}`, `${message.author.avatarURL()}`).setTimestamp()

        message.channel.send({embeds: [botHelpMenu]})
    }

    if (command == "startcount" || command == "resetcount") {
        if (!message.member.permissions.has([Discord.Permissions.FLAGS.MANAGE_CHANNELS])) return message.channel.send("Imagine trying to use an admin command lol | تخيل تجرب كومند ادمن ويشتغل لول")
        if (args.length == 0) {
            redis_client.set(`${message.channel.id}-count`, 0);
            redis_client.set(`${message.channel.id}-lastuser`, 0);
        } else if (args.length == 1) {
            redis_client.set(`${args[0]}-count`, 0);
            redis_client.set(`${args[0]}-lastuser`, 0);
        }
        if (args.length > 1) return message.channel.send("Please use the correct syntax | استخدم النط الصحيح")
        if (!parseInt(args[0]) || !message.guild.channels.cache.get(args[0])) return message.channel.send("This channel isn't a valid counting channel | هذ ليست قناة عد")
    }
    
    if (command == "count") {
        if (args.length == 0) {
            let value = await redis_client.get(`${message.channel.id}-count`)
            console.log(value)
            if (value == null) return message.channel.send("This channel isn't a valid counting channel | هذ ليست قناة عد")
            if (value != null) {
                message.channel.send(`The current number is: **${value}**`)
            }
        } else if (args.length > 0) {
            console.log(args[0])
            let value = await redis_client.get(`The current number is **${value}**`)
            if (value == null) return message.channel.send("This channel isn't a valid counting channel | هذه ليست قناة عد")
            if (value != null) {
                message.channel.send(value)
            }
        }
    }

    message.react("✅")
}

//Handle Crashes
process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
});

client.login(token)
run_redis();
