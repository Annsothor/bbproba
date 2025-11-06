let actions = [];
let rerollCount = 0;
let currentBlock = null;

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

  if (type.includes("contre")) {
    return Math.pow(pFace, dice); // défavorable
  } else {
    return 1 - Math.pow(1 - pFace, dice); // favorable
  }
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
    let usedReroll = false;

    if (skill) {
      // relance de compétence
      p = p + (1 - p) * p;
      usedReroll = true;
    } else if (rerollsLeft > 0 && p < 1) {
      // sinon relance d’équipe
      p = p + (1 - p) * p;
      rerollsLeft -= 1;
      usedReroll = true;
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
