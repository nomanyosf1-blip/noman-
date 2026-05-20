import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  SlashCommandBuilder, 
  REST, 
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Structure for log entries
interface SystemLog {
  id: string;
  timestamp: string;
  type: "spam" | "link" | "invite" | "badwords" | "mention" | "ghostping" | "botjoin" | "duplicate" | "shortener" | "lockdown" | "zalgo" | "system" | "alt" | "emojispam" | "caps" | "selfbot" | "webhook" | "verification";
  level: "info" | "warning" | "critical";
  message: string;
  user?: string;
}

// In-memory logs
let systemLogs: SystemLog[] = [
  {
    id: "init",
    timestamp: new Date().toISOString(),
    type: "system",
    level: "info",
    message: "تم بدء نظام الحماية بنجاح وجاري فحص الاتصال.",
  }
];

// Helper to push logs and keep size reasonable
const addLog = (type: SystemLog["type"], level: SystemLog["level"], message: string, user?: string) => {
  const newLog: SystemLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type,
    level,
    message,
    user,
  };
  systemLogs.unshift(newLog);
  if (systemLogs.length > 50) {
    systemLogs = systemLogs.slice(0, 50);
  }

  // Forward to discord log channel async
  if (typeof sendDiscordLog === "function") {
    sendDiscordLog(newLog);
  }
};

// In-memory settings
let botSettings = {
  antiSpam: true,
  antiLink: false,
  antiInvite: true,
  antiBadWords: true,
  antiMassMention: true,
  antiGhostPing: true,
  antiBotJoin: false,
  antiDuplicate: true,
  antiLinkShortener: true,
  antiZalgo: false,
  serverLockdown: false,
  maxMentions: 5,
  badWords: ['كلب', 'حمار', 'وسخ', 'تفه', 'غبي'],
  
  // New settings requested
  antiAltAccount: true,
  altMinAgeDays: 7,
  antiSpamEmojis: false,
  maxEmojis: 10,
  antiCaps: false,
  antiSelfBot: true,
  antiWebhookSpam: true,
  verificationSystem: false,
  logsChannelId: "",
};

const createSecurityEmbed = () => {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ نظام حماية حارس البوت - المتكامل 2.0')
    .setDescription('تحكم في أمن واستقرار سيرفرك من خلال الأزرار أدناه:')
    .setColor('#10b981')
    .addFields(
      { name: '🚫 السبام', value: botSettings.antiSpam ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🔗 الروابط', value: botSettings.antiLink ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '📩 الدعوات', value: botSettings.antiInvite ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🤬 الكلمات', value: botSettings.antiBadWords ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '📢 المنشن', value: botSettings.antiMassMention ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '👻 المنشن المخفي', value: botSettings.antiGhostPing ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🤖 بوتات سبام', value: botSettings.antiBotJoin ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '👯 التكرار', value: botSettings.antiDuplicate ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '✂️ اختصار الروابط', value: botSettings.antiLinkShortener ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '💥 نصوص غريبة', value: botSettings.antiZalgo ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '⏳ الحسابات الوهمية', value: botSettings.antiAltAccount ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '😃 سبام إيموجي', value: botSettings.antiSpamEmojis ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🔠 الحروف الكبيرة', value: botSettings.antiCaps ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🦾 سيلف بوت', value: botSettings.antiSelfBot ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '📡 ويب هوك سبام', value: botSettings.antiWebhookSpam ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🗳️ نظام التحقق', value: botSettings.verificationSystem ? '✅ مفعل' : '❌ معطل', inline: true },
      { name: '🔒 الإغلاق التام', value: botSettings.serverLockdown ? '🔴 نشط' : '⚪ خامل', inline: true }
    )
    .setFooter({ text: 'حارس الأمان المتطور • لوحة التحكم السريعة' })
    .setTimestamp();

  // Discord button structures - max 5 buttons per row
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('toggle_antiSpam').setLabel('السبام').setStyle(botSettings.antiSpam ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiLink').setLabel('الروابط').setStyle(botSettings.antiLink ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiInvite').setLabel('الدعوات').setStyle(botSettings.antiInvite ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiBadWords').setLabel('قفل الكلمات').setStyle(botSettings.antiBadWords ? ButtonStyle.Success : ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('toggle_antiMassMention').setLabel('المنشن').setStyle(botSettings.antiMassMention ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiGhostPing').setLabel('المخفي').setStyle(botSettings.antiGhostPing ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiBotJoin').setLabel('حظر البوتات').setStyle(botSettings.antiBotJoin ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_antiDuplicate').setLabel('التكرار').setStyle(botSettings.antiDuplicate ? ButtonStyle.Success : ButtonStyle.Danger),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('toggle_antiAltAccount').setLabel('الحسابات الوهمية').setStyle(botSettings.antiAltAccount ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_verificationSystem').setLabel('تفعيل التحقق').setStyle(botSettings.verificationSystem ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_serverLockdown').setLabel('وضع الإغلاق').setStyle(botSettings.serverLockdown ? ButtonStyle.Danger : ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row1, row2, row3] };
};

let botStatus = "offline";
let botUser: any = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const logTypeLabels: Record<string, string> = {
  spam: "🚨 تصفية الإغراق وحجم الرسائل والسبام",
  link: "🔗 حظر الروابط والصفحات الخارجية",
  invite: "📩 حظر دعوات سيرفرات ديسكورد الأخرى",
  badwords: "🤬 كشف وتصفية الكلمات والألفاظ البذيئة",
  mention: "📢 المنشن الجماعي العشوائي المفرط",
  ghostping: "👻 رصد المنشن المخفي (Ghost Ping)",
  botjoin: "🤖 حظر وطرد البوتات العشوائية المهاجمة",
  duplicate: "👯 منع تكرار الرسائل المتشابهة (سبام)",
  shortener: "✂️ منع روابط الاختصار والصفحات المشبوهة",
  lockdown: "🔒 تفعيل وضع الطوارئ والإغلاق الشامل",
  zalgo: "💥 كشف النصوص والأكواد المشوهة (Zalgo)",
  system: "⚙️ إشعار وتحديثات نظام الحارس التلقائي",
  alt: "⏳ طرد حساب وهمي أو جديد عن الحد المسموح",
  emojispam: "😃 كشف سبام طوفان الوجوه التعبيرية",
  caps: "🔠 منع الأحرف الكابيتال الكبيرة والضوضاء",
  selfbot: "🦾 رصد وحظر حسابات السيلف بوت المبرمجة",
  webhook: "📡 حظر رسائل ويب هوك ضارة أو عشوائية",
  verification: "🗳️ توجيه وإرسال نظام التحقق للأعضاء"
};

const sendDiscordLog = async (log: SystemLog) => {
  if (!botSettings.logsChannelId || !client.isReady()) return;

  try {
    const channel = await client.channels.fetch(botSettings.logsChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    let color = 0x3b82f6; // Blue info
    let emoji = "ℹ️";
    
    if (log.level === "critical") {
      color = 0xef4444; // Red
      emoji = "🔴";
    } else if (log.level === "warning") {
      color = 0xf97316; // Orange
      emoji = "⚠️";
    }

    const label = logTypeLabels[log.type] || log.type;

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} إشعارات سجل الحارس الفورية والمفصلة`)
      .setColor(color)
      .setDescription(`**تم رصد وتوثيق الإجراء الأمني التالي لحماية السيرفر:**`)
      .addFields(
        { name: "⚡ نوع الحدث", value: `**${label}**`, inline: true },
        { name: "👤 المتسبب / الهدف", value: log.user ? `\`@${log.user}\`` : "نظام تلقائي", inline: true },
        { name: "🛡️ مستوى الأهمية", value: log.level === "critical" ? "🔴 خطير وحرج جداً" : log.level === "warning" ? "⚠️ تحذير حماية" : "ℹ️ إشعار عام", inline: true },
        { name: "📝 رسالة الرصد", value: `\`\`\`css\n${log.message}\n\`\`\`` },
        { name: "📅 توقيت الرصد", value: `<t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`, inline: false }
      )
      .setFooter({ text: "نظام حارس الأمان المتطور • مكافحة التخريب والعبث", iconURL: client.user?.displayAvatarURL() })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Failed to forward log to discord channel:", err);
  }
};

// Slash Command Registration
const commands = [
  new SlashCommandBuilder()
    .setName('security')
    .setDescription('عرض لوحة تحكم الحماية المتكاملة لنسب خيارات أكثر'),
  new SlashCommandBuilder()
    .setName('scyrty')
    .setDescription('عرض لوحة تحكم الحماية المتكاملة لنسب خيارات أكثر (اختصار)'),
].map(command => command.toJSON());

const registerCommands = async () => {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID) {
    console.warn("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID, skipping command registration.");
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
    addLog("system", "info", "تم تحديث وتسجيل أوامر (/) بنجاح على سيرفرات الديسكورد.");
  } catch (error: any) {
    console.error(error);
    addLog("system", "critical", `فشل تسجيل أوامر الديسكورد: ${error.message || error}`);
  }
};

// Bot Logic
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).then(() => {
    registerCommands();
  }).catch((err) => {
    console.error("Failed to login to Discord:", err.message);
    addLog("system", "critical", `فشل تسجيل دخول البوت: ${err.message}`);
  });
}

client.on(Events.Error, (error) => {
  console.error("Discord Client Error:", error);
  addLog("system", "critical", `حدث خطأ في عميل ديسكورد: ${error.message}`);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  botStatus = "online";
  botUser = {
    tag: readyClient.user.tag,
    id: readyClient.user.id,
    avatar: readyClient.user.displayAvatarURL(),
  };
  addLog("system", "info", `البوت متصل الآن باسم ${readyClient.user.tag}`);
});

// Track duplicate messages
const lastMessages = new Map<string, { content: string; timestamp: number }>();

// Block unauthorized bots from joining & protect against alts
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot && botSettings.antiBotJoin) {
    try {
      await member.kick("المنع التلقائي للبوتات غير المصرح بها مفعل.");
      addLog("botjoin", "critical", `تم طرد بوت غير مصرح به حاول الانضمام للسيرفر`, member.user.tag);
    } catch (err: any) {
      console.error("Failed to kick forbidden bot:", err);
      addLog("botjoin", "warning", `حاول بوت الانضمام ولكن فشل البوت في طرده لعدم وجود صلاحيات كافية`, member.user.tag);
    }
    return;
  }

  if (!member.user.bot && botSettings.antiAltAccount) {
    const minAgeMs = botSettings.altMinAgeDays * 24 * 60 * 60 * 1000;
    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    if (accountAgeMs < minAgeMs) {
      try {
        await member.kick(`حساب وهمي/جديد تقل مدة إنشائه عن ${botSettings.altMinAgeDays} أيام`);
        addLog("alt", "critical", `تم طرد حساب وهمي/جديد (@${member.user.tag}) عمره أقل من الحد المسموح به`, member.user.tag);
        return;
      } catch (err: any) {
        addLog("alt", "warning", `فشل طرد الحساب الوهمي @${member.user.tag} لعدم كفاية الصلاحيات أو ترتيب رولات البوت`, member.user.tag);
      }
    }
  }

  if (!member.user.bot && botSettings.verificationSystem) {
    addLog("verification", "info", `انضم العضو الجديد @${member.user.tag} وجاري مطالبته بالتحقق والدفع الأمني لحماية المجتمع`, member.user.tag);
    try {
      const embed = new EmbedBuilder()
        .setTitle("🔒 تحقق الحماية والأمان")
        .setDescription(`مرحباً ${member.user}، السيرفر مفعل به نظام التحقق من الهوية ضد البوتات.\nالرجاء كتابة \`/verify\` أو التفاعل للحصول على رول العضو المعتمد.`)
        .setColor("#10b981");
      await member.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {}
  }
});

// Handle Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      console.log(`Command received: ${interaction.commandName} from ${interaction.user.tag}`);
      if (interaction.commandName === 'security' || interaction.commandName === 'scyrty') {
        await interaction.reply(createSecurityEmbed());
      }
    } else if (interaction.isButton()) {
      console.log(`Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
      
      await interaction.deferUpdate();

      const customId = interaction.customId;
      if (customId === 'toggle_antiSpam') botSettings.antiSpam = !botSettings.antiSpam;
      if (customId === 'toggle_antiLink') botSettings.antiLink = !botSettings.antiLink;
      if (customId === 'toggle_antiInvite') botSettings.antiInvite = !botSettings.antiInvite;
      if (customId === 'toggle_antiBadWords') botSettings.antiBadWords = !botSettings.antiBadWords;
      if (customId === 'toggle_antiMassMention') botSettings.antiMassMention = !botSettings.antiMassMention;
      if (customId === 'toggle_antiGhostPing') botSettings.antiGhostPing = !botSettings.antiGhostPing;
      if (customId === 'toggle_antiBotJoin') botSettings.antiBotJoin = !botSettings.antiBotJoin;
      if (customId === 'toggle_antiDuplicate') botSettings.antiDuplicate = !botSettings.antiDuplicate;
      if (customId === 'toggle_antiLinkShortener') botSettings.antiLinkShortener = !botSettings.antiLinkShortener;
      if (customId === 'toggle_antiZalgo') botSettings.antiZalgo = !botSettings.antiZalgo;
      if (customId === 'toggle_antiAltAccount') botSettings.antiAltAccount = !botSettings.antiAltAccount;
      if (customId === 'toggle_antiSpamEmojis') botSettings.antiSpamEmojis = !botSettings.antiSpamEmojis;
      if (customId === 'toggle_antiCaps') botSettings.antiCaps = !botSettings.antiCaps;
      if (customId === 'toggle_antiSelfBot') botSettings.antiSelfBot = !botSettings.antiSelfBot;
      if (customId === 'toggle_antiWebhookSpam') botSettings.antiWebhookSpam = !botSettings.antiWebhookSpam;
      if (customId === 'toggle_verificationSystem') botSettings.verificationSystem = !botSettings.verificationSystem;
      if (customId === 'toggle_serverLockdown') botSettings.serverLockdown = !botSettings.serverLockdown;

      addLog("system", "info", `تم تعديل إعداد (${customId.replace('toggle_', '')}) إلى: ${botSettings[customId.replace('toggle_', '') as keyof typeof botSettings] ? 'مفعل' : 'معطل'}`, interaction.user.tag);
      await interaction.editReply(createSecurityEmbed());
    }
  } catch (error: any) {
    if (error.code !== 10062) {
      console.error("Interaction Error:", error);
    }
  }
});

client.on(Events.MessageDelete, async (message) => {
  if (!botSettings.antiGhostPing || message.author?.bot) return;
  if (message.mentions.users.size > 0 || message.mentions.roles.size > 0) {
    message.channel.send(`⚠️ **كشف منشن مخفي! (Ghost Ping Detected)**\nالعضو: ${message.author}\nالمحتوى: ${message.content || "[محتوى غير نصي/صورة]"}`).catch(() => {});
    addLog("ghostping", "warning", `تم رصد منشن مخفي من العضو في القناة`, message.author.tag);
  }
});

// List of standard link shorteners
const linkShorteners = [
  "bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "buff.ly", "shorte.st", "adf.ly", "rb.gy", "goo.gl", "ow.ly"
];

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    // Webhook Spam Blocker
    if (message.webhookId && botSettings.antiWebhookSpam) {
      const webhookContent = message.content || "";
      if (webhookContent.includes("http") || webhookContent.includes("@everyone") || webhookContent.includes("@here")) {
        await message.delete().catch(() => {});
        addLog("webhook", "critical", `تم حظر وحذف رسالة ويب هوك مشبوهة أو سبام دائم`, "منفذ الويب هوك");
      }
    }
    return;
  }

  const content = message.content || "";

  // SelfBot Detection
  if (botSettings.antiSelfBot && message.embeds && message.embeds.length > 0) {
    await message.delete().catch(() => {});
    addLog("selfbot", "critical", `حذف رسالة سيلف بوت محظورة (حساب يرغب في محاكاة البوت)`, message.author.tag);
    return message.channel.send(`${message.author}، الرجاء عدم استخدام حساب سيلف بوت لتفادي التدابير الأمنية!`).catch(() => {});
  }

  // Emoji Spam Check
  if (botSettings.antiSpamEmojis) {
    const emojiMatch = content.match(/<a?:.+?:\d+>|[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g);
    const emojiCount = emojiMatch ? emojiMatch.length : 0;
    if (emojiCount > botSettings.maxEmojis) {
      await message.delete().catch(() => {});
      addLog("emojispam", "warning", `حذف رسالة تحتوي على عدد مفرط [${emojiCount}] من الوجوه التعبيرية`, message.author.tag);
      return message.channel.send(`${message.author}، يرجى عدم إرسال طوفان وسخ من الإيموجيز!`).catch(() => {});
    }
  }

  // Caps Spam Check
  if (botSettings.antiCaps && content.length > 8) {
    const alphaCount = content.replace(/[^a-zA-Z]/g, "").length;
    if (alphaCount > 6) {
      const capsCount = content.replace(/[^A-Z]/g, "").length;
      if (capsCount / alphaCount > 0.7) {
        await message.delete().catch(() => {});
        addLog("caps", "warning", `حذف رسالة ذات خط مفرط الحجم (CAPS LOCK)`, message.author.tag);
        return message.channel.send(`${message.author}، الرجاء عدم استخدام أحرف كبيرة ومستفزة!`).catch(() => {});
      }
    }
  }

  // 1. Lockdown Mode Check
  if (botSettings.serverLockdown) {
    await message.delete().catch(() => {});
    addLog("lockdown", "critical", `تم حذف رسالة أثناء تفعيل وضع الإغلاق التام للسيرفر`, message.author.tag);
    return;
  }

  // 2. Anti-Invite Protection
  if (botSettings.antiInvite && (content.includes("discord.gg/") || content.includes("discord.com/invite/"))) {
    await message.delete().catch(() => {});
    addLog("invite", "warning", `حذف رابط دعوة لسيرفر آخر تم إرساله`, message.author.tag);
    return message.channel.send(`${message.author}، ممنوع إرسال دعوات السيرفرات الأخرى للحفاظ على الأمان!`).catch(() => {});
  }

  // 3. Anti-Link Shorteners Protection
  if (botSettings.antiLinkShortener && linkShorteners.some(short => content.toLowerCase().includes(short))) {
    await message.delete().catch(() => {});
    addLog("shortener", "warning", `حذف رابط استخدام لمختصر روابط مشبوه`, message.author.tag);
    return message.channel.send(`${message.author}، يرجى عدم إرسال مختصرات روابط للحماية من السكام و الحظر!`).catch(() => {});
  }

  // 4. Anti-BadWords Protection
  if (botSettings.antiBadWords && botSettings.badWords.some(word => content.includes(word))) {
    await message.delete().catch(() => {});
    addLog("badwords", "warning", `حذف رسالة تحتوي على كلمات بذيئة ومحظورة`, message.author.tag);
    return message.channel.send(`${message.author}، يرجى الالتزام بالآداب العامة وعدم استخدام كلمات مسيئة!`).catch(() => {});
  }

  // 5. Anti-MassMention Protection
  if (botSettings.antiMassMention && message.mentions.users.size > botSettings.maxMentions) {
    await message.delete().catch(() => {});
    addLog("mention", "critical", `حذف رسالة منشن جماعي بـ ${message.mentions.users.size} عضو`, message.author.tag);
    return message.channel.send(`${message.author}، لا يسمح بمنشن عدد كبير من الأعضاء لمنع الإزعاج!`).catch(() => {});
  }

  // 6. Anti-Duplicate Messages Protection
  if (botSettings.antiDuplicate) {
    const userKey = message.author.id;
    const now = Date.now();
    const lastMsg = lastMessages.get(userKey);
    if (lastMsg && lastMsg.content === content && now - lastMsg.timestamp < 4000) {
      await message.delete().catch(() => {});
      addLog("duplicate", "warning", `حذف رسالة مكررة تم إرسالها خلال فترة قصيرة جداً`, message.author.tag);
      return message.channel.send(`${message.author}، يرجى عدم تكرار الرسائل لمنع السبام!`).catch(() => {});
    }
    lastMessages.set(userKey, { content, timestamp: now });
  }

  // 7. Anti-Zalgo Protection
  if (botSettings.antiZalgo) {
    const combiningMarksCount = (content.match(/[\u0300-\u036f\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g) || []).length;
    if (combiningMarksCount > 15) {
      await message.delete().catch(() => {});
      addLog("zalgo", "warning", `حذف رسالة تحتوي على خلل نصوص غريبة (Zalgo/Glitch Text)`, message.author.tag);
      return message.channel.send(`${message.author}، الرجاء عدم إرسال نصوص مشوهة أو مضرة للشات!`).catch(() => {});
    }
  }

  // 8. Legacy command check
  if (content === '!scyrty' || content === '/scyrty') {
    await message.reply(createSecurityEmbed()).catch(() => {});
    return;
  }

  // 9. Legacy anti-link
  if (botSettings.antiLink && content.includes("http") && !content.includes("discord.gg/") && !content.includes("discord.com/invite/")) {
    await message.delete().catch(() => {});
    addLog("link", "warning", `حذف رابط عام مرسل في الشات`, message.author.tag);
    message.channel.send(`${message.author}، يرجى عدم مشاركة الروابط هنا!`).catch(() => {});
  }

  // 10. Anti-Spam (Large text block)
  if (botSettings.antiSpam && content.length > 800) {
    await message.delete().catch(() => {});
    addLog("spam", "warning", `حذف رسالة طويلة جداً تتجاوز الحد الأقصى للحروف`, message.author.tag);
    message.channel.send(`${message.author}، حجم الرسالة كبير جداً وغير مسموح به هنا للحفاظ على هدوء الشات!`).catch(() => {});
  }
});

async function startServer() {
  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/status", (req, res) => {
    res.json({ 
      status: botStatus, 
      bot: botUser, 
      settings: botSettings,
      logs: systemLogs,
      config: {
        hasToken: !!process.env.DISCORD_TOKEN,
        hasClientId: !!process.env.DISCORD_CLIENT_ID
      }
    });
  });

  app.post("/api/settings", (req, res) => {
    botSettings = { ...botSettings, ...req.body };
    addLog("system", "info", "تم تحديث إعدادات نظام الحماية عن طريق لوحة التحكم التفاعلية.");
    res.json({ success: true, settings: botSettings });
  });

  app.post("/api/test-log", async (req, res) => {
    if (!botSettings.logsChannelId) {
      return res.status(400).json({ error: "الرجاء إدخال معرف قناة السجلات أولاً وحفظ الإعدادات" });
    }
    if (!client.isReady()) {
      return res.status(503).json({ error: "⚠️ البوت غير متصل حالياً بالديسكورد، يرجى تزويد البوت بالتوكن والانتظار." });
    }

    try {
      const channel = await client.channels.fetch(botSettings.logsChannelId).catch(() => null);
      if (!channel) {
        return res.status(404).json({ error: "❌ تعذر العثور على القناة. تأكد من أن المعرف صحيح ومن أن البوت عضو في السيرفر ويمتلك صلاحيات رؤية القناة." });
      }
      if (!channel.isTextBased()) {
        return res.status(400).json({ error: "❌ القناة المحددة ليست قناة نصية! يرجى تحديد قناة شات أو سجلات صالحة." });
      }

      const embed = new EmbedBuilder()
        .setTitle("🧪 إشعار فحص سجل الحارس 2.0")
        .setColor(0x10b981)
        .setDescription("تهانينا! لقد تم إعداد نظام السجلات المفصل بقنوات الديسكورد بنجاح.")
        .addFields(
          { name: "📡 حالة الاتصال", value: "✅ مستقر ومتصل", inline: true },
          { name: "🛠️ إصدار النظام", value: "v2.0 Premium", inline: true },
          { name: "👤 تم الفحص بواسطة", value: "لوحة التحكم التفاعلية للويب", inline: true }
        )
        .setFooter({ text: "حارس البوت • نظام التحصين" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      addLog("system", "info", "تم إرسال رسالة تجريبية بنجاح إلى قناة السجل المحددة.");
      res.json({ success: true, message: "تم إرسال رسالة فحص تجريبية بنجاح إلى ديسكورد!" });
    } catch (err: any) {
      console.error("Test log send error:", err);
      res.status(500).json({ error: `فشل في إرسال الرسالة: ${err.message || err}` });
    }
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
