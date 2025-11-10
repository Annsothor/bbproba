let actions = [];
let rerollCount = 0;
let currentBlock = null;

// ====================== PROBAS ACTIONS ======================

function successChance(threshold) {
  return (7 - threshold) / 6;
}

function addAction(action) {
  actions.push(action);
  updateDisplay();
}

function chooseBlock(type) {
  currentBlock = { type, successes: [] };
  document.getElementById("blockOptions").classList.remove("hidden");
}

function confirmBlockChoice() {
  const checkboxes = document.querySelectorAll("#blockOptions input[type=checkbox]");
  const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
  currentBlock.successes = selected;
  addAction(currentBlock);
  document.getElementById("blockOptions").classList.add("hidden");
}

function changeRerolls(delta) {
  rerollCount = Math.max(0, rerollCount + delta);
  document.getElementById("rerollCount").textContent = rerollCount;
  updateDisplay();
}

function blockSuccessProb(type, successes) {
  const allFaces = ["skull", "bothdown", "push", "powpush", "pow", "push"];
  let successCount = allFaces.filter(f => successes.includes(f)).length;
  let pFace = successCount / 6;

  let dice = 1;
  if (type === "2d") dice = 2;
  if (type === "3d") dice = 3;
  if (type === "2d-contre") dice = 2;
  if (type === "3d-contre") dice = 3;

  return type.includes("contre")
    ? Math.pow(pFace, dice)
    : 1 - Math.pow(1 - pFace, dice);
}

function hasSkill(skillId) {
  return document.getElementById(skillId).checked;
}

function getSkillForAction(action) {
  if (action.type === "roll") {
    if (hasSkill("skill-dodge") && action.threshold <= 3) return "Dodge";
    if (hasSkill("skill-surefeet") && action.threshold === 2) return "SureFeet";
    if (hasSkill("skill-surehands") && action.threshold === 3) return "SureHands";
    if (hasSkill("skill-pass") && action.threshold >= 2) return "Pass";
    if (hasSkill("skill-catch") && action.threshold >= 2) return "Catch";
  }
  return null;
}

function computeProbability() {
  if (actions.length === 0) return 1.0;

  let total = 1.0;
  let rerollsLeft = rerollCount;

  actions.forEach(a => {
    let p = 0;
    if (a.type === "roll") p = successChance(a.threshold);
    else if (a.type.includes("d")) p = blockSuccessProb(a.type, a.successes);

    const skill = getSkillForAction(a);

    if (skill) {
      p = p + (1 - p) * p; // reroll de compétence
    } else if (rerollsLeft > 0 && p < 1) {
      p = p + (1 - p) * p; // reroll d’équipe
      rerollsLeft -= 1;
    }

    total *= p;
  });

  return total;
}

function updateDisplay() {
  const prob = computeProbability();
  document.getElementById("result").textContent =
    "Probabilité : " + (prob * 100).toFixed(2) + "%";

  const actionNames = actions.map(a => {
    if (a.type === "roll") return a.threshold + "+";
    if (a.type.includes("d")) return "Bloc " + a.type;
  });

  document.getElementById("actions").textContent = actions.length
    ? "Actions : " + actionNames.join(", ")
    : "";
}

function resetAll() {
  actions = [];
  rerollCount = 0;
  document.getElementById("rerollCount").textContent = 0;
  document.getElementById("blockOptions").classList.add("hidden");
  ["skill-dodge","skill-surefeet","skill-surehands","skill-pass","skill-catch"].forEach(id=>{
    document.getElementById(id).checked = false;
  });
  updateDisplay();
}

updateDisplay();

// ====================== ARMURE / BLESSURE ======================

function roll2d6Prob(threshold) {
  // Probabilité que 2d6 + bonus >= seuil
  let count = 0;
  for (let i = 2; i <= 12; i++) {
    if (i >= threshold) count += get2d6Combos(i);
  }
  return count / 36;
}

function get2d6Combos(sum) {
  return [0,0,1,2,3,4,5,6,5,4,3,2,1][sum] || 0;
}

function calculateArmorAndInjury() {
  let armor = parseInt(document.getElementById("armorValue").value);
  const foul = parseInt(document.getElementById("foulBonus").value);
  const mbArmor = parseInt(document.getElementById("mbArmor").value);
  const claw = document.getElementById("claw").checked;
  const armorReroll = document.getElementById("armorReroll").checked;

  let mbInjury = parseInt(document.getElementById("mbInjury").value);
  const stunty = document.getElementById("stunty").checked;
  const injuryBonus = parseInt(document.getElementById("injuryBonus").value);

  // griffe -> armure max 8
  if (claw && armor > 8) armor = 8;

  // probas d’armure
  let neededArmor = armor - (foul + mbArmor);
  let pArmor = roll2d6Prob(neededArmor);

  if (armorReroll) pArmor = pArmor + (1 - pArmor) * pArmor;

  document.getElementById("armorResult").textContent =
    "Chance de passer l’armure : " + (pArmor * 100).toFixed(2) + "%";

  // Si Châtaigne utilisée sur armure, pas dispo sur blessure
  let mbUsedOnArmor = mbArmor > 0;
  if (mbUsedOnArmor) mbInjury = 0;

  // calcul blessure (8-9 KO / 10-12 blessé)
  let totalBonus = mbInjury + injuryBonus + (stunty ? 1 : 0);
  let pKO = roll2d6Prob(8 - totalBonus) - roll2d6Prob(10 - totalBonus);
  let pCas = roll2d6Prob(10 - totalBonus);

  document.getElementById("injuryResults").textContent =
    "KO : " + (pKO * 100).toFixed(2) + "% — Blessure : " + (pCas * 100).toFixed(2) + "%";
}
