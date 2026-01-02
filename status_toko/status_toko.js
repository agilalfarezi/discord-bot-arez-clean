import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const statusFile = path.resolve("./status_toko/status.json");

function loadStatus() {
  if (!fs.existsSync(statusFile)) {
    fs.writeFileSync(statusFile, JSON.stringify({ status: "OPEN" }, null, 2));
  }
  return JSON.parse(fs.readFileSync(statusFile, "utf8"));
}

function saveStatus(data) {
  fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
}

// ==========================
// SLASH COMMAND
// ==========================
export const statusCommand = new SlashCommandBuilder()
  .setName("status_toko")
  .setDescription("Ubah status toko (admin only)")
  .addStringOption((opt) =>
    opt
      .setName("status")
      .setDescription("Status toko")
      .setRequired(true)
      .addChoices(
        { name: "OPEN", value: "OPEN" },
        { name: "CLOSE", value: "CLOSE" }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// ==========================
// HANDLER ADMIN
// ==========================
export async function handleStatusSlash(interaction) {
  const status = interaction.options.getString("status");

  saveStatus({ status });

  await interaction.reply({
    content: `✅ Status toko diubah menjadi **${status}**`,
    ephemeral: true,
  });
}

// ==========================
// HANDLER BUYER
// ==========================
export function handleStatusMessage(message) {
  const { status } = loadStatus();

  const isOpen = status === "OPEN";

  const embed = new EmbedBuilder()
    .setTitle("🏪 STATUS TOKO")
    .setDescription(
      isOpen
        ? "🟢 **TOKO SEDANG BUKA**\nSilakan order 🚀"
        : "🔴 **TOKO SEDANG TUTUP**\nMohon tunggu ya 🙏"
    )
    .setColor(isOpen ? "#00FF88" : "#FF4444");

  message.reply({ embeds: [embed] });
}
