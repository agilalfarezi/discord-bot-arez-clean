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

    const list = Object.values(game.gamepasses)
      .map((gp) => {
        const harga = gp.robux * data.rate;
        return `-  ${gp.name} : Rp ${harga.toLocaleString("id-ID")}`;
      })
      .join("\n");

    embed.setDescription(list);

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

    if (!data.games[gameKey]) {
      return interaction.reply({
        content: "❌ Game tidak ditemukan",
        ephemeral: true,
      });
    }

    data.games[gameKey].gamepasses[key] = { name, robux };
    saveData(data);

    return interaction.reply(`✅ Gamepass **${name}** ditambahkan`);
  }

  if (interaction.commandName === "price_set_rate") {
    data.rate = interaction.options.getInteger("rate");
    saveData(data);

    return interaction.reply(`✅ Rate diubah menjadi **${data.rate}**`);
  }
}
