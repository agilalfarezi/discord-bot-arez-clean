import {
  Client,
  ActionRowBuilder,
  ButtonBuilder, // TAMBAHKAN INI
  ButtonStyle, // TAMBAHKAN INI
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createPaymentEmbed } from "./payment/pay.js";
import {
  priceCommandsList,
  handlePriceInteraction,
} from "./prices/pricecommands.js";
dotenv.config();

// ===================================================
// KODE UNTUK BACKUP
// ===================================================
const BACKUP_DIR = path.resolve("./backup");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ===================================================
// 🧠 Inisialisasi Client
// ===================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

global.discordClient = client;

// ===================================================
// 💾 TRANSAKSI SECTION
// ===================================================
const transactionsFile = "./transactions.json";

function loadTransactions() {
  if (!fs.existsSync(transactionsFile)) {
    fs.writeFileSync(transactionsFile, "{}");
  }
  return JSON.parse(fs.readFileSync(transactionsFile));
}

async function saveTransactions(data) {
  // 1️⃣ simpan file utama
  fs.writeFileSync(transactionsFile, JSON.stringify(data, null, 2));

  // 2️⃣ backup lokal
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const backupPath = path.join(BACKUP_DIR, `transactions-${timestamp}.json`);

  fs.copyFileSync(transactionsFile, backupPath);

  // 3️⃣ backup Discord (1x per hari)
  const markerFile = "./last_discord_backup.txt";
  const todayDate = today();

  let lastBackupDate = "";
  if (fs.existsSync(markerFile)) {
    lastBackupDate = fs.readFileSync(markerFile, "utf8");
  }

  if (lastBackupDate !== todayDate) {
    try {
      const channel = await global.discordClient.channels.fetch(
        process.env.BACKUP_CHANNEL_ID
      );

      await channel.send({
        content: `🗂️ Backup transaksi harian\n📅 ${todayDate}`,
        files: [transactionsFile],
      });

      fs.writeFileSync(markerFile, todayDate);
    } catch (err) {
      console.error("❌ Gagal kirim backup harian:", err);
    }
  }
}

// ===================================================
// 💾 STOCK SECTION
// ===================================================
const stockFile = path.resolve("./stock/stock.json");

if (!fs.existsSync(stockFile)) {
  fs.writeFileSync(stockFile, JSON.stringify({ stock: 51497 }, null, 2));
  console.log("✅ File stock.json dibuat otomatis!");
}

function loadStock() {
  return JSON.parse(fs.readFileSync(stockFile, "utf8"));
}
function saveStock(stock) {
  fs.writeFileSync(stockFile, JSON.stringify(stock, null, 2));
}

// ===================================================
// ⚙️ SLASH COMMANDS
// ===================================================
const commands = [
  ...priceCommandsList,

  // 🟢 Tambah transaksi
  new SlashCommandBuilder()
    .setName("add_transaksi")
    .setDescription("Tambah transaksi customer (hanya admin)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Customer").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("item").setDescription("Nama barang").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("harga").setDescription("Harga barang").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 🔵 Lihat transaksi pribadi
  new SlashCommandBuilder()
    .setName("total_transaksi")
    .setDescription("Lihat total transaksi kamu"),

  // 🟣 Lihat transaksi user lain
  new SlashCommandBuilder()
    .setName("total_transaksi_admin")
    .setDescription("Lihat total transaksi user lain (admin only)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User target").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 🗑️ Hapus transaksi user
  new SlashCommandBuilder()
    .setName("delete_transaksi")
    .setDescription("Hapus transaksi user berdasarkan nomornya (admin only)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User target").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("nomor")
        .setDescription("Nomor transaksi yang ingin dihapus")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 🟡 Ubah stock robux
  new SlashCommandBuilder()
    .setName("set_stock")
    .setDescription("Ubah jumlah stock robux (admin only)")
    .addIntegerOption((opt) =>
      opt
        .setName("jumlah")
        .setDescription("Jumlah stock baru")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 💳 PAY (ADMIN ONLY)
  new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Hitung total pembayaran & tampilkan QRIS")
    .addNumberOption((opt) =>
      opt.setName("robux").setDescription("Jumlah Robux").setRequired(true)
    )
    .addNumberOption((opt) =>
      opt.setName("rate").setDescription("Rate per Robux").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

// ===================================================
// 🚀 DEPLOY SLASH COMMANDS
// ===================================================
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("✅ Semua Slash Commands berhasil di-deploy!");
  } catch (error) {
    console.error("❌ Gagal deploy slash commands:", error);
  }
})();

// ===================================================
// 💬 COMMAND: !stock
// ===================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "!stock") {
    const data = loadStock();

    const embed = new EmbedBuilder()
      .setTitle("📦 STOCK ROBUX")
      .setDescription(
        `**Stock robux tersedia saat ini:** R$ ${data.stock.toLocaleString(
          "id-ID"
        )}\n\n*Stock otomatis diupdate setiap 15 menit sekali.*`
      )
      .setColor("#00FF88");

    message.reply({ embeds: [embed] });
  }
});

// ===================================================
// ⚙️ HANDLER SLASH COMMANDS
// ===================================================
client.on("interactionCreate", async (interaction) => {
  // ===================================================
  // 🔥 HANDLE PRICE SYSTEM (CHAT + SELECT MENU)
  // ===================================================
  await handlePriceInteraction(interaction);

  // ===================================================
  // ⛔ STOP kalau bukan slash command
  // ===================================================
  if (!interaction.isChatInputCommand()) return;
  const transactions = loadTransactions();

  // ==================
  // 🔶 /add_transaksi
  // ==================
  if (interaction.commandName === "add_transaksi") {
    const user = interaction.options.getUser("user");
    const item = interaction.options.getString("item");
    const harga = interaction.options.getInteger("harga");

    const date = new Date().toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });

    if (!transactions[user.id]) transactions[user.id] = [];
    transactions[user.id].push({ item, harga, date });
    await saveTransactions(transactions);

    return interaction.reply(
      `✅ Transaksi berhasil ditambahkan untuk **${user.username}**:\n` +
        `> Barang: **${item}**\n> Harga: Rp ${harga.toLocaleString("id-ID")}`
    );
  }

  // =============================================
  // 🔷 /total_transaksi (BUYER - WITH PAGINATION)
  // ==============================================
  if (interaction.commandName === "total_transaksi") {
    const data = transactions[interaction.user.id] || [];

    if (data.length === 0) {
      return interaction.reply({
        content: "📭 Kamu belum memiliki riwayat transaksi.",
        ephemeral: true,
      });
    }

    // --- PENGATURAN PAGINATION ---
    const itemsPerPage = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(data.length / itemsPerPage);

    // Hitung TOTAL KESELURUHAN milik buyer
    const totalHargaSemua = data.reduce((acc, curr) => acc + curr.harga, 0);

    const generateBuyerPayload = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const currentItems = data.slice(start, end);

      const listText = currentItems
        .map((t, i) => {
          return `**${start + i + 1}.** ${t.item} | Rp ${t.harga.toLocaleString(
            "id-ID"
          )}\n📅 ${t.date}`;
        })
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle("📦 Riwayat Transaksi Kamu")
        .setDescription(listText)
        .addFields({
          name: "💰 Total Belanja Kamu",
          value: `**Rp ${totalHargaSemua.toLocaleString("id-ID")}**`,
        })
        .setFooter({
          text: `Halaman ${page + 1} dari ${totalPages} | Total: ${
            data.length
          } transaksi`,
        })
        .setColor("#00FF88");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_buyer")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next_buyer")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );

      return { embeds: [embed], components: [row] };
    };

    const response = await interaction.reply({
      ...generateBuyerPayload(currentPage),
      ephemeral: true, // Biar cuma buyer yang bisa liat
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next_buyer") currentPage++;
      else if (i.customId === "prev_buyer") currentPage--;

      await i.update(generateBuyerPayload(currentPage));
    });

    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }

  // ===================================================
  // 🟣 /total_transaksi_admin (PAGINATION - LIMIT 10)
  // ===================================================
  if (interaction.commandName === "total_transaksi_admin") {
    const targetUser = interaction.options.getUser("user");
    const data = transactions[targetUser.id] || [];

    if (data.length === 0) {
      return interaction.reply({
        content: `📭 **${targetUser.username}** belum memiliki riwayat transaksi.`,
        ephemeral: true,
      });
    }

    // --- PENGATURAN PAGINATION ---
    const itemsPerPage = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(data.length / itemsPerPage);

    // Hitung TOTAL KESELURUHAN (Semua data, bukan cuma per halaman)
    const totalHargaSemua = data.reduce((acc, curr) => acc + curr.harga, 0);

    const generatePayload = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const currentItems = data.slice(start, end);

      const listText = currentItems
        .map((t, i) => {
          // Penomoran lanjut (Halaman 1: 1-10, Halaman 2: 11-20, dst)
          return `**${start + i + 1}.** ${t.item} | Rp ${t.harga.toLocaleString(
            "id-ID"
          )}\n📅 ${t.date}`;
        })
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle(`📦 Riwayat Transaksi: ${targetUser.username}`)
        .setDescription(listText)
        .addFields({
          name: "💰 Total Transaksi Keseluruhan",
          value: `**Rp ${totalHargaSemua.toLocaleString("id-ID")}**`, // Tetap total semua
        })
        .setFooter({
          text: `Halaman ${page + 1} dari ${totalPages} | Total Item: ${
            data.length
          }`,
        })
        .setColor("#00FF88");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );

      return { embeds: [embed], components: [row] };
    };

    const response = await interaction.reply({
      ...generatePayload(currentPage),
      fetchReply: true,
    });

    // Collector untuk interaksi tombol
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "next") currentPage++;
      else if (i.customId === "prev") currentPage--;

      await i.update(generatePayload(currentPage));
    });

    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("⬅️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }

  // ===================================================
  // 🗑️ /delete_transaksi (admin only)
  // ===================================================
  if (interaction.commandName === "delete_transaksi") {
    const targetUser = interaction.options.getUser("user");
    const nomor = interaction.options.getInteger("nomor");

    const userData = transactions[targetUser.id];

    if (!userData || userData.length === 0) {
      return interaction.reply({
        content: `📭 ${targetUser.username} tidak memiliki transaksi.`,
        ephemeral: true,
      });
    }

    if (nomor < 1 || nomor > userData.length) {
      return interaction.reply({
        content: `❌ Nomor transaksi tidak valid! Total transaksi: ${userData.length}`,
        ephemeral: true,
      });
    }

    const removed = userData.splice(nomor - 1, 1);
    saveTransactions(transactions);

    return interaction.reply(
      `🗑️ Transaksi nomor **${nomor}** milik **${targetUser.username}** berhasil dihapus!\n` +
        `> Item: **${
          removed[0].item
        }**\n> Harga: Rp ${removed[0].harga.toLocaleString("id-ID")}`
    );
  }

  // ===================================================
  // 🟢 /set_stock
  // ===================================================
  if (interaction.commandName === "set_stock") {
    const jumlah = interaction.options.getInteger("jumlah");
    const data = loadStock();

    data.stock = jumlah;
    saveStock(data);

    return interaction.reply(
      `✅ Stock berhasil diubah menjadi: **R$ ${jumlah.toLocaleString(
        "id-ID"
      )}**`
    );
  }

  // ===============================
  // 💳 /pay
  // ===============================
  if (interaction.commandName === "pay") {
    const robux = interaction.options.getNumber("robux");
    const rate = interaction.options.getNumber("rate");

    const total = Math.ceil(robux * rate);

    const embed = createPaymentEmbed(total);

    return interaction.reply({
      embeds: [embed],
      files: [
        {
          attachment: "./payment/qrisarezstore.jpg",
          name: "qrisarezstore.jpg",
        },
      ],
    });
  }
});

// ===================================================
// 🟢 BOT READY
// ===================================================
client.once("ready", () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  // ===================================================
  // ⏰ AUTO BACKUP FINAL HARIAN (23:59)
  // ===================================================
  setInterval(async () => {
    const now = new Date();
    const jam = now.getHours();
    const menit = now.getMinutes();

    if (jam === 23 && menit === 59) {
      try {
        const data = loadTransactions();
        await saveTransactions(data);
        console.log("🗂️ Backup final harian (23:59) berhasil");
      } catch (err) {
        console.error("❌ Backup 23:59 gagal:", err);
      }
    }
  }, 60 * 1000); // cek tiap 1 menit
});

client.login(process.env.TOKEN);
