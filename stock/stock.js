// stock.js (versi modular)
import fs from "fs";
import path from "path";
import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

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

// Command definisi
export const stockCommands = [
  new SlashCommandBuilder()
    .setName("set_stock")
    .setDescription("Ubah jumlah stock robux (admin only)")
    .addIntegerOption((option) =>
      option
        .setName("jumlah")
        .setDescription("Jumlah stock baru")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

// Handler event command
export async function handleStockCommand(interaction) {
  if (interaction.commandName === "set_stock") {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "🚫 Hanya admin yang bisa mengubah stock!",
        ephemeral: true,
      });
    }

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
}

// Handler pesan biasa (!stock)
export function handleStockMessage(message) {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "!stock") {
    const data = loadStock();
    const embed = new EmbedBuilder()
      .setTitle("📦 STOCK ROBUX")
      .setDescription(
        `**Stock robux tersedia saat ini:** R$ ${data.stock.toLocaleString(
          "id-ID"
        )}`
      )
      .setColor("#00FF88");
    message.reply({ embeds: [embed] });
  }
}
