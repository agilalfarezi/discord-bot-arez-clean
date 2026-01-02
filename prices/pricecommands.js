import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from "discord.js";
import fs from "fs";
import path from "path";

const dataFile = path.resolve("./prices/priceData.json");

function loadData() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify({ rate: 90, games: {} }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// =======================
// SLASH COMMAND LIST
// =======================
export const priceCommandsList = [
  // BUYER
  new SlashCommandBuilder()
    .setName("price")
    .setDescription("Cek harga gamepass Roblox"),

  //======================//
  // UNTUK BUGDET //
  //======================//
  new SlashCommandBuilder()
    .setName("budget_robux")
    .setDescription(
      "Untuk cek berapa Robux yang bisa kamu dapatkan dari budget yang kamu punya"
    )
    .addIntegerOption((opt) =>
      opt
        .setName("rupiah")
        .setDescription("Budget dalam Rupiah")
        .setRequired(true)
    ),

  // =======================
  // PRICE ROBUX (CALCULATOR)
  // =======================
  new SlashCommandBuilder()
    .setName("price_robux")
    .setDescription("Kalkulator harga Robux (auto tax 30%)")
    .addIntegerOption((opt) =>
      opt
        .setName("jumlah")
        .setDescription("Jumlah Robux yang ingin diterima")
        .setRequired(true)
    ),

  // ADMIN
  new SlashCommandBuilder()
    .setName("price_add_game")
    .setDescription("Tambah game Roblox")
    .addStringOption((o) =>
      o.setName("key").setDescription("ID game (tanpa spasi)").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("name").setDescription("Nama game").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("price_add_gamepass")
    .setDescription("Tambah gamepass")
    .addStringOption((o) =>
      o.setName("game").setDescription("Key game").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("key").setDescription("Key gamepass").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("name").setDescription("Nama gamepass").setRequired(true)
    )
    .addIntegerOption((o) =>
      o.setName("robux").setDescription("Harga Robux").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("category")
        .setDescription("Kategori (Gamepass / Boost / Item / dll)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("price_set_rate")
    .setDescription("Set rate Robux")
    .addIntegerOption((o) =>
      o.setName("rate").setDescription("Rate baru").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// =======================
// INTERACTION HANDLER
// =======================
export async function handlePriceInteraction(interaction) {
  const data = loadData();

  // ================= BUDGET ROBUX =================
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "budget_robux"
  ) {
    const data = loadData();
    const budget = interaction.options.getInteger("rupiah");
    const rate = data.rate;

    if (budget < rate) {
      return interaction.reply({
        content: "❌ Budget terlalu kecil.",
        ephemeral: true,
      });
    }

    // hitung maksimal gamepass
    let gamepass = Math.floor(budget / rate);

    // pastikan tidak lewat budget
    while (gamepass * rate > budget) {
      gamepass--;
    }

    const robux = Math.floor(gamepass * 0.7);
    const total = gamepass * rate;

    const embed = new EmbedBuilder()
      .setTitle("🧮 Kalkulator Budget Robux 5 Hari")
      .setColor("#00FF88")
      .setDescription(
        `Dengan budget **Rp ${budget.toLocaleString(
          "id-ID"
        )}**, kamu bisa membeli **${robux.toLocaleString("id-ID")} Robux**.`
      )
      .addFields({
        name: `${robux.toLocaleString("id-ID")} Robux`,
        value: `Rp ${total.toLocaleString("id-ID")}`,
      })
      .addFields({
        name: "Nominal Set Gamepass",
        value: `Buat gamepass dengan harga **${gamepass.toLocaleString(
          "id-ID"
        )} Robux**`,
      })
      .setFooter({
        text: "Sudah termasuk pajak Roblox 30% • Robux masuk ±5 hari",
      });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
  // ================= BUYER /price =================
  if (interaction.commandName === "price") {
    const games = Object.entries(data.games);

    if (games.length === 0) {
      return interaction.reply({
        content: "❌ Belum ada produk tersedia.",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_game")
      .setPlaceholder("Pilih game")
      .addOptions(
        games.map(([key, g]) => ({
          label: g.name,
          value: key,
        }))
      );

    return interaction.reply({
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  }

  // ================= PRICE ROBUX =================
  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === "price_robux"
  ) {
    const data = loadData();
    const robux = interaction.options.getInteger("jumlah");
    const rate = data.rate;

    const gamepassPrice = Math.ceil(robux / 0.7); // harga gamepass
    const rupiah = gamepassPrice * rate; // FIX: pakai gamepass, bukan robux

    const embed = new EmbedBuilder()
      .setTitle("🧮 Robux Price Calculator")
      .setColor("#00FF88")
      .addFields(
        {
          name: "Jumlah Robux",
          value: `**R$ ${robux.toLocaleString("id-ID")}**`,
          inline: true,
        },
        {
          name: "Total Harga",
          value: `**Rp ${rupiah.toLocaleString("id-ID")}**`,
          inline: true,
        },
        {
          name: "Nominal Set Gamepass",
          value: `Set gamepass ke **R$ ${gamepassPrice.toLocaleString(
            "id-ID"
          )}**`,
        }
      )
      .setFooter({
        text: "Sudah termasuk pajak Roblox 30% • Robux masuk ±5 hari",
      });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  // ================= SELECT GAME =================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "select_game") return;

    const gameKey = interaction.values[0];
    const game = data.games[gameKey];

    const embed = new EmbedBuilder()
      .setTitle(`💸 Price list - ${game.name}`)
      .setColor("#00FF88");

    const grouped = {};

    Object.values(game.gamepasses).forEach((gp) => {
      const harga = gp.robux * data.rate;
      const cat = gp.category || "Lainnya";

      if (!grouped[cat]) grouped[cat] = [];

      grouped[cat].push(
        `- ${gp.name} (**${gp.robux} R$**) : **Rp ${harga.toLocaleString(
          "id-ID"
        )}**`
      );
    });

    let desc = "";

    for (const [cat, items] of Object.entries(grouped)) {
      desc += `### 📂 ${cat}\n${items.join("\n")}\n\n`;
    }

    embed.setDescription(desc.trim());

    return interaction.update({ embeds: [embed], components: [] });
  }

  // ================= ADMIN COMMANDS =================
  if (interaction.commandName === "price_add_game") {
    const key = interaction.options.getString("key");
    const name = interaction.options.getString("name");

    data.games[key] = { name, gamepasses: {} };
    saveData(data);

    return interaction.reply(`✅ Game **${name}** berhasil ditambahkan`);
  }

  if (interaction.commandName === "price_add_gamepass") {
    const gameKey = interaction.options.getString("game");
    const key = interaction.options.getString("key");
    const name = interaction.options.getString("name");
    const robux = interaction.options.getInteger("robux");
    const category = interaction.options.getString("category");

    if (!data.games[gameKey]) {
      return interaction.reply({
        content: "❌ Game tidak ditemukan",
        ephemeral: true,
      });
    }

    data.games[gameKey].gamepasses[key] = {
      name,
      robux,
      category,
    };

    saveData(data);

    return interaction.reply(
      `✅ **${name}** ditambahkan ke kategori **${category}**`
    );
  }

  if (interaction.commandName === "price_set_rate") {
    data.rate = interaction.options.getInteger("rate");
    saveData(data);

    return interaction.reply(`✅ Rate diubah menjadi **${data.rate}**`);
  }
}
