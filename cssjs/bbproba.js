// ====================== VARIABLES GLOBALES ======================
let actions = [];
let rerollCount = 0;
let currentBlock = null;

// ====================== PROBAS ACTIONS ======================

/**
 * Calcule la probabilité de réussir un jet de dé avec un seuil donné
 */
function successChance(threshold) {
  return (7 - threshold) / 6;
}

/**
 * Ajoute une action à la liste et recalcule
 */
function addAction(action) {
  actions.push(action);
  updateDisplay();
}

/**
 * Prépare le choix d'un blocage
 */
function chooseBlock(type) {
  currentBlock = { type, successes: [] };
  document.getElementById("blockOptions").classList.remove("hidden");
  
  // Reset des checkboxes (seulement POW coché par défaut)
  const checkboxes = document.querySelectorAll("#blockOptions input[type=checkbox]");
  checkboxes.forEach(cb => {
    cb.checked = (cb.value === "pow");
  });
}

/**
 * Valide le choix de blocage et l'ajoute aux actions
 */
function confirmBlockChoice() {
  const checkboxes = document.querySelectorAll("#blockOptions input[type=checkbox]");
  const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
  
  if (selected.length === 0) {
    alert("Veuillez sélectionner au moins un résultat !");
    return;
  }
  
  currentBlock.successes = selected;
  addAction(currentBlock);
  document.getElementById("blockOptions").classList.add("hidden");
  currentBlock = null;
}

/**
 * Change le nombre de relances d'équipe
 */
function changeRerolls(delta) {
  rerollCount = Math.max(0, rerollCount + delta);
  document.getElementById("rerollCount").textContent = rerollCount;
  updateDisplay();
}

/**
 * Calcule la probabilité de succès d'un blocage selon le type et les faces acceptées
 */
function blockSuccessProb(type, successes) {
  // Les 6 faces du dé de blocage (ordre standard BB)
  const allFaces = ["skull", "bothdown", "push", "powpush", "pow", "push"];
  
  // Compter combien de faces sont considérées comme réussies
  let successCount = 0;
  for (let face of allFaces) {
    if (successes.includes(face)) {
      successCount++;
    }
  }
  
  const pFace = successCount / 6;
  
  // Déterminer le nombre de dés
  let dice = 1;
  if (type === "2d" || type === "2d-contre") dice = 2;
  if (type === "3d" || type === "3d-contre") dice = 3;
  
  // Pour un blocage "contre", on DOIT avoir tous les dés qui réussissent
  // Pour un blocage normal, on choisit le meilleur dé
  if (type.includes("contre")) {
    return Math.pow(pFace, dice);
  } else {
    // Probabilité qu'au moins un dé réussisse
    return 1 - Math.pow(1 - pFace, dice);
  }
}

/**
 * Vérifie si une compétence est cochée
 */
function hasSkill(skillId) {
  const el = document.getElementById(skillId);
  return el ? el.checked : false;
}

/**
 * Détermine quelle compétence s'applique à une action donnée
 * CORRIGÉ : les compétences s'appliquent selon les règles BB
 */
function getSkillForAction(action) {
  if (action.type === "roll") {
    // Esquive : relance les jets d'esquive (3+ ou 4+ généralement)
    // On considère que c'est pour les jets 3+ et 4+
    if (hasSkill("skill-dodge") && (action.threshold === 3 || action.threshold === 4)) {
      return "Esquive";
    }
    
    // Équilibre : relance les jets de GFI (2+)
    if (hasSkill("skill-surefeet") && action.threshold === 2) {
      return "Équilibre";
    }
    
    // Prise sûre : relance les jets de ramassage (variable mais souvent >=3+)
    if (hasSkill("skill-surehands") && action.threshold >= 3 && action.threshold <= 6) {
      return "Prise sûre";
    }
    
    // Passe : relance les jets de passe (variable)
    if (hasSkill("skill-pass") && action.threshold >= 2 && action.threshold <= 6) {
      return "Passe";
    }
    
    // Réception : relance les jets de réception (variable)
    if (hasSkill("skill-catch") && action.threshold >= 2 && action.threshold <= 6) {
      return "Réception";
    }
  }
  return null;
}

/**
 * Calcule la probabilité totale de réussite de toute la séquence d'actions
 * CORRIGÉ : gestion correcte des relances de compétences vs équipe
 */
function computeProbability() {
  if (actions.length === 0) return 1.0;

  let total = 1.0;
  let rerollsLeft = rerollCount;

  actions.forEach(action => {
    // Probabilité de base
    let p = 0;
    if (action.type === "roll") {
      p = successChance(action.threshold);
    } else if (action.type.includes("d")) {
      p = blockSuccessProb(action.type, action.successes);
    }

    // Vérifier si une compétence s'applique
    const skill = getSkillForAction(action);

    if (skill) {
      // Relance de compétence (gratuite) : p_total = p + (1-p) * p
      p = p + (1 - p) * p;
    } else if (rerollsLeft > 0) {
      // Relance d'équipe disponible
      p = p + (1 - p) * p;
      rerollsLeft--;
    }

    total *= p;
  });

  return total;
}

/**
 * Met à jour l'affichage de la probabilité et de la liste d'actions
 */
function updateDisplay() {
  const prob = computeProbability();
  document.getElementById("result").textContent =
    "Probabilité : " + (prob * 100).toFixed(2) + "%";

  // Générer la liste des actions pour affichage
  const actionNames = actions.map(action => {
    if (action.type === "roll") {
      return action.threshold + "+";
    }
    if (action.type.includes("d")) {
      let name = "Bloc " + action.type.toUpperCase();
      const skill = getSkillForAction(action);
      if (skill) name += " (" + skill + ")";
      return name;
    }
    return "?";
  });

  const actionsDiv = document.getElementById("actions");
  if (actions.length > 0) {
    actionsDiv.textContent = "Actions : " + actionNames.join(" → ");
  } else {
    actionsDiv.textContent = "Aucune action définie";
  }
}

/**
 * Réinitialise tout
 */
function resetAll() {
  actions = [];
  rerollCount = 0;
  currentBlock = null;
  
  document.getElementById("rerollCount").textContent = "0";
  document.getElementById("blockOptions").classList.add("hidden");
  
  // Décocher toutes les compétences
  ["skill-dodge", "skill-surefeet", "skill-surehands", "skill-pass", "skill-catch"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  
  updateDisplay();
}

// ====================== ARMURE / BLESSURE ======================

/**
 * Calcule la probabilité qu'un jet de 2d6 soit >= threshold
 */
function roll2d6Prob(threshold) {
  if (threshold < 2) return 1;
  if (threshold > 12) return 0;
  
  let count = 0;
  for (let i = threshold; i <= 12; i++) {
    count += get2d6Combos(i);
  }
  return count / 36;
}

/**
 * Retourne le nombre de combinaisons pour obtenir une somme donnée avec 2d6
 */
function get2d6Combos(sum) {
  const combos = {
    2: 1,  // (1,1)
    3: 2,  // (1,2), (2,1)
    4: 3,  // (1,3), (2,2), (3,1)
    5: 4,  // (1,4), (2,3), (3,2), (4,1)
    6: 5,  // ...
    7: 6,
    8: 5,
    9: 4,
    10: 3,
    11: 2,
    12: 1
  };
  return combos[sum] || 0;
}

/**
 * Calcule les probabilités d'armure et de blessure
 * CORRIGÉ : ajout de mbInjury manquant et gestion de Crâne épais
 */
function calculateArmorAndInjury() {
  // ===== ARMURE =====
  let armor = parseInt(document.getElementById("armorValue").value);
  const foul = parseInt(document.getElementById("foulBonus").value);
  const mbArmor = parseInt(document.getElementById("mbArmor").value);
  const claw = document.getElementById("claw").checked;
  const armorReroll = document.getElementById("armorReroll").checked;

  // Griffe : l'armure est considérée comme 8 maximum
  if (claw && armor > 8) {
    armor = 8;
  }

  // Seuil nécessaire pour passer l'armure
  const neededArmor = armor - (foul + mbArmor);
  let pArmor = roll2d6Prob(neededArmor);

  // Relance d'armure
  if (armorReroll) {
    pArmor = pArmor + (1 - pArmor) * pArmor;
  }

  document.getElementById("armorResult").textContent =
    "Chance de passer l'armure : " + (pArmor * 100).toFixed(2) + "%";

  // ===== BLESSURE =====
  const mbInjury = parseInt(document.getElementById("mbInjury").value);
  const thickSkull = document.getElementById("thickSkull").checked;
  const stunty = document.getElementById("stunty").checked;
  const injuryBonus = parseInt(document.getElementById("injuryBonus").value);

  // Si Châtaigne utilisée sur armure, elle n'est plus disponible pour blessure
  const effectiveMbInjury = (mbArmor > 0) ? 0 : mbInjury;

  // Calcul des bonus de blessure
  let totalBonus = effectiveMbInjury + injuryBonus;
  if (stunty) totalBonus += 1;

  // Crâne épais : relance le premier résultat KO/Blessé (on modélise comme -1 au bonus)
  if (thickSkull) totalBonus -= 1;

  // KO : 8-9 sur 2d6
  // Blessure : 10-12 sur 2d6
  const pKO = roll2d6Prob(8 - totalBonus) - roll2d6Prob(10 - totalBonus);
  const pCas = roll2d6Prob(10 - totalBonus);

  document.getElementById("injuryResults").innerHTML =
    '<span class="injury-ko">KO : ' + (pKO * 100).toFixed(2) + '%</span> • ' +
    '<span class="injury-cas">Blessure : ' + (pCas * 100).toFixed(2) + '%</span>';
}

// ====================== INITIALISATION ======================
updateDisplay();
calculateArmorAndInjury();