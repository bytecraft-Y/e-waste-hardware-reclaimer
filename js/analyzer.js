// E-Waste Hardware Reclaimer - Analysis Engine
// Handles parsing, matching, and aggregation

class ComponentAnalyzer {
  constructor(database) {
    this.database = database || window.COMPONENT_DATABASE || [];
    this.buildIndex();
  }

  // Build model token index from database
  buildIndex() {
    this.modelIndex = [];
    for (const item of this.database) {
      const modelTokens = [];
      for (const alias of item.searchTokens) {
        const tokens = this.extractModelTokens(alias);
        for (const token of tokens) {
          if (!modelTokens.includes(token)) {
            modelTokens.push(token);
          }
        }
      }
      // Store the extracted model tokens on the item
      item.modelTokens = modelTokens;
      
      if (modelTokens.length > 0) {
        this.modelIndex.push({ item, modelTokens });
      }
    }
  }

  // Extract model/part number tokens (e.g. "lm358", "ne555", "7805", "cr2032")
  extractModelTokens(str) {
    if (!str) return [];
    // Normalize spacing around letters/numbers, e.g. "nema 17" -> "nema17", "cr 2032" -> "cr2032"
    // Only merge if the letters are 1-4 chars
    let normalized = str.toLowerCase()
      .replace(/\b([a-z]{1,4})\s+(\d+)\b/g, '$1$2')
      .replace(/\b(\d+)\s+([a-z]{1,4})\b/g, '$1$2');
    
    // Split by spaces, hyphens, slashes, periods, commas, underscores
    const words = normalized.split(/[\s_\-\/\.\,]+/);
    const modelTokens = [];
    for (const word of words) {
      // A model token is:
      // - mixed letters and digits (e.g. lm358, ne555, 1n4007)
      // - OR 3 to 5 digits (e.g. 555, 7805, 2032)
      if (/^[a-z]+\d+|\d+[a-z]+$/i.test(word) || /^\d{3,5}$/.test(word)) {
        modelTokens.push(word);
      }
    }
    return modelTokens;
  }

  // Match model tokens with tolerance for minor suffix variations (e.g. atmega328 vs atmega328p)
  modelTokensMatch(t1, t2) {
    if (t1 === t2) return true;
    const clean = t => t.replace(/[^a-z0-9]/g, '');
    const c1 = clean(t1);
    const c2 = clean(t2);
    if (c1 === c2) return true;
    
    // Suffix tolerance: if one starts with the other, and difference is <= 2 chars
    if (c1.startsWith(c2) && c1.length - c2.length <= 2) return true;
    if (c2.startsWith(c1) && c2.length - c1.length <= 2) return true;
    
    return false;
  }

  // Check if a model token is a generic spec rather than a unique part number
  static isGenericSpec(token) {
    // Check if it's a standard electrical unit rating, size, or package code
    // Units: v, w, hz, mhz, khz, a, ma, f, uf, pf, nf, mm, ohm, r, k, m
    if (/^\d+(v|w|hz|mhz|khz|a|ma|f|uf|pf|nf|mm|ohm|r|k|m)$/i.test(token)) {
      return true;
    }
    // Common package codes
    if (/^(0805|0603|1206|0402)$/.test(token)) {
      return true;
    }
    return false;
  }

  // Calculate Levenshtein distance between two strings
  static getLevenshteinDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  // Token-based Jaccard similarity
  static getJaccardSimilarity(s1, s2) {
    const t1 = new Set(s1.toLowerCase().split(/\s+/).filter(x => x.length > 1));
    const t2 = new Set(s2.toLowerCase().split(/\s+/).filter(x => x.length > 1));
    
    if (t1.size === 0 || t2.size === 0) return 0;
    
    const intersection = new Set([...t1].filter(x => t2.has(x)));
    const union = new Set([...t1, ...t2]);
    return intersection.size / union.size;
  }

  // Match input string to database entry
  matchComponent(inputText) {
    const text = inputText.toLowerCase().trim();
    if (!text) return null;

    // First, try Model/Part Number Token Matching (Highest Precision)
    const inputModelTokens = this.extractModelTokens(text);
    if (inputModelTokens.length > 0) {
      let bestModelMatch = null;
      let bestModelScore = 0;

      for (const { item, modelTokens } of this.modelIndex) {
        for (const dbToken of modelTokens) {
          for (const inputToken of inputModelTokens) {
            if (this.modelTokensMatch(inputToken, dbToken)) {
              // Verify generic spec condition
              if (ComponentAnalyzer.isGenericSpec(dbToken)) {
                // Must also match another search token of the item
                const otherTokens = item.searchTokens.filter(t => !t.includes(dbToken));
                const matchesKeyword = otherTokens.some(alias => {
                  const words = alias.split(/\s+/);
                  return words.some(word => text.includes(word));
                });
                if (!matchesKeyword) {
                  continue; // Reject this match as it's a generic spec without correct context
                }
              }

              const score = (inputToken === dbToken) ? 1.0 : 0.95;
              if (score > bestModelScore) {
                bestModelScore = score;
                bestModelMatch = item;
              }
            }
          }
        }
      }

      if (bestModelMatch) {
        return {
          item: { ...bestModelMatch },
          score: bestModelScore,
          matchType: 'exact'
        };
      }
    }

    let bestMatch = null;
    let highestScore = 0;

    // Second, scan for exact or phrase substring matches
    for (const item of this.database) {
      for (const alias of item.searchTokens) {
        if (text === alias) {
          return { item: { ...item }, score: 1.0, matchType: 'exact' };
        }
        if (text.includes(alias) || alias.includes(text)) {
          const score = Math.min(alias.length, text.length) / Math.max(alias.length, text.length) * 0.9;
          if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
          }
        }
      }
    }

    // Second, use Jaccard similarity on tokens
    for (const item of this.database) {
      for (const alias of item.searchTokens) {
        const jaccard = ComponentAnalyzer.getJaccardSimilarity(text, alias);
        if (jaccard > highestScore && jaccard > 0.2) {
          highestScore = jaccard;
          bestMatch = item;
        }
      }
    }

    // Third, fallback to character Levenshtein distance for close typos
    if (highestScore < 0.4) {
      for (const item of this.database) {
        for (const alias of item.searchTokens) {
          const distance = ComponentAnalyzer.getLevenshteinDistance(text, alias);
          const maxLength = Math.max(text.length, alias.length);
          const similarity = 1 - distance / maxLength;
          if (similarity > highestScore && similarity > 0.6) {
            highestScore = similarity;
            bestMatch = item;
          }
        }
      }
    }

    if (bestMatch && highestScore > 0.3) {
      return {
        item: { ...bestMatch },
        score: parseFloat(highestScore.toFixed(2)),
        matchType: highestScore > 0.8 ? 'high' : 'medium'
      };
    }

    // Generic fallback if no match found but we can guess by keywords
    return this.generateGenericComponent(inputText);
  }

  // Create a generic item based on keywords
  generateGenericComponent(inputText) {
    const text = inputText.toLowerCase();
    
    // Check if it's likely a resistor
    if (text.includes('resistor') || text.includes('ohm') || text.match(/\d+\s?[r|k|m]/)) {
      return {
        item: {
          name: inputText,
          category: "passive",
          subcategory: "resistor",
          package: text.includes('smd') || text.includes('chip') ? 'smd' : 'through-hole',
          classification: "recyclable",
          desolderDifficulty: text.includes('smd') ? 3 : 1,
          hazards: [],
          hazardMaterials: [],
          estimatedValue: 0.01,
          repurposeIdeas: ["Standard pull-up/down resistors", "Breadboard prototyping"],
          safetyNotes: "Identified as a general resistor. Safe to handle.",
          recyclingInfo: "Standard e-waste recycling."
        },
        score: 0.5,
        matchType: 'generic'
      };
    }
    
    // Check if capacitor
    if (text.includes('capacitor') || text.includes('cap') || text.includes('uf') || text.includes('pf') || text.includes('microfarad')) {
      const isElectrolytic = text.includes('electrolytic') || text.includes('polar');
      return {
        item: {
          name: inputText,
          category: "passive",
          subcategory: "capacitor",
          package: text.includes('smd') ? 'smd' : 'through-hole',
          classification: isElectrolytic ? "salvageable" : "recyclable",
          desolderDifficulty: 2,
          hazards: isElectrolytic ? ["Potential electrolyte leak/explosion if old"] : [],
          hazardMaterials: [],
          estimatedValue: isElectrolytic ? 0.10 : 0.02,
          repurposeIdeas: ["Power decoupling", "Signal filtering"],
          safetyNotes: "General capacitor. Discharge fully before desoldering.",
          recyclingInfo: "Standard e-waste recycling."
        },
        score: 0.5,
        matchType: 'generic'
      };
    }

    // Check if diode/led
    if (text.includes('diode') || text.includes('led')) {
      return {
        item: {
          name: inputText,
          category: "semiconductor",
          subcategory: "diode",
          package: "through-hole",
          classification: "salvageable",
          desolderDifficulty: 1,
          hazards: [],
          hazardMaterials: [],
          estimatedValue: 0.05,
          repurposeIdeas: ["Indicator lights", "Reverse voltage protection"],
          safetyNotes: "General diode. Keep heat minimum during desoldering.",
          recyclingInfo: "Standard e-waste."
        },
        score: 0.5,
        matchType: 'generic'
      };
    }

    // Default unknown component
    return {
      item: {
        name: inputText,
        category: "unknown",
        subcategory: "misc",
        package: "through-hole",
        classification: "recyclable",
        desolderDifficulty: 2,
        hazards: ["Unknown safety profile"],
        hazardMaterials: [],
        estimatedValue: 0.02,
        repurposeIdeas: ["Inspect for markings to search datasheet online."],
        safetyNotes: "Unidentified component. Handle with caution, inspect for chemical leaks.",
        recyclingInfo: "Dispose at a standard e-waste collection center."
      },
      score: 0.1,
      matchType: 'none'
    };
  }

  // Parse conditions (like leaking, old, smd, swollen) out of text
  parseConditions(inputText) {
    const text = inputText.toLowerCase();
    const flags = {
      isLeaking: text.includes('leak') || text.includes('crusty') || text.includes('corrode') || text.includes('rust'),
      isSwollen: text.includes('swollen') || text.includes('bulg') || text.includes('bloat') || text.includes('puff'),
      isBurnt: text.includes('burnt') || text.includes('char') || text.includes('smoke') || text.includes('smell'),
      isOld: text.includes('old') || text.includes('vintage') || text.includes('retro') || text.includes('antique') || text.includes('1970') || text.includes('1980'),
      isSmdOverride: text.includes('smd') || text.includes('surface mount') || text.includes('chip')
    };

    return flags;
  }

  // Process a single user-entered component line
  analyzeLine(lineText) {
    if (!lineText.trim()) return null;

    // Extract Quantity (e.g., "10x resistor", "5 capacitor", "quantity 3 mosfets", "12v relay x4")
    let quantity = 1;
    let cleanText = lineText.trim();

    // Check patterns with high precision:
    // Explicit quantity has x, pcs, or qty indicator. Implicit quantity is only 1-2 digits to avoid matching part numbers (e.g. 555, 0805, 7805)
    const explicitPrefixMatch = cleanText.match(/^(?:qty:?\s*)?(\d+)\s*(?:pcs|x|pcs\s*of)\s+/i);
    const implicitPrefixMatch = cleanText.match(/^(\d{1,2})\s+/);
    
    const explicitSuffixMatch = cleanText.match(/\s+(?:x\s*|qty:?\s*)(\d+)(?:\s*pcs)?$/i) || cleanText.match(/\s+(\d+)\s*pcs$/i);
    const implicitSuffixMatch = cleanText.match(/\s+(\d{1,2})$/);

    if (explicitPrefixMatch) {
      quantity = parseInt(explicitPrefixMatch[1], 10);
      cleanText = cleanText.replace(explicitPrefixMatch[0], ' ').trim();
    } else if (implicitPrefixMatch) {
      quantity = parseInt(implicitPrefixMatch[1], 10);
      cleanText = cleanText.replace(implicitPrefixMatch[0], ' ').trim();
    } else if (explicitSuffixMatch) {
      quantity = parseInt(explicitSuffixMatch[1], 10);
      cleanText = cleanText.replace(explicitSuffixMatch[0], ' ').trim();
    } else if (implicitSuffixMatch) {
      quantity = parseInt(implicitSuffixMatch[1], 10);
      cleanText = cleanText.replace(implicitSuffixMatch[0], ' ').trim();
    }

    // Clean multiple spaces
    cleanText = cleanText.replace(/\s+/g, ' ');

    // Extract condition words
    const conditions = this.parseConditions(cleanText);

    // Run the matcher
    const matchResult = this.matchComponent(cleanText);
    if (!matchResult) return null;

    const component = matchResult.item;

    // Apply modifiers based on conditions
    if (conditions.isSmdOverride) {
      component.package = 'smd';
      component.desolderDifficulty = Math.max(component.desolderDifficulty, 3);
    }

    if (conditions.isLeaking || conditions.isSwollen || conditions.isBurnt) {
      // Bulging, leaking or burnt components are dangerous or useless
      component.classification = 'hazardous';
      component.estimatedValue = 0;
      component.repurposeIdeas = ["Do NOT reuse. Destructive failure detected."];
      
      let hazardText = "";
      if (conditions.isLeaking) hazardText = "corrosive electrolyte leak";
      else if (conditions.isSwollen) hazardText = "gassing / internal pressure expansion (explosion hazard)";
      else hazardText = "severe thermal damage (short circuit indicator)";
      
      if (!component.hazards.includes(hazardText)) {
        component.hazards.unshift(hazardText);
      }
      component.safetyNotes = `WARNING: Component shows signs of ${hazardText}. Do not apply power, do not handle bare-handed if leaking.`;
      component.recyclingInfo = "Take immediately to a hazardous e-waste facility. Do not store indoors.";
    }

    if (conditions.isOld && component.subcategory === 'capacitor') {
      // Vintage capacitors might be ASKAREL/PCB oil filled
      if (!component.hazards.includes("Potential vintage carcinogen/PCB content")) {
        component.hazards.push("Potential vintage carcinogen/PCB content");
      }
      component.safetyNotes = "Vintage capacitor. Inspect for Askarel oil markers. If oil-filled and made before 1979, treat as hazardous PCB waste.";
    }

    return {
      rawInput: lineText,
      cleanedName: cleanText,
      quantity: quantity,
      component: component,
      matchConfidence: matchResult.score,
      matchType: matchResult.matchType,
      conditions: Object.keys(conditions).filter(k => conditions[k])
    };
  }

  // Parse multi-line BOM (Bill of Materials) text
  analyzeBOM(bomText) {
    if (!bomText) return [];
    
    // Split by lines or semicolons
    const lines = bomText.split(/[\n;\r]+/).map(l => l.trim()).filter(l => l.length > 0);
    const results = [];

    for (const line of lines) {
      const result = this.analyzeLine(line);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  // Get average weights in grams for diversion stats
  static getComponentWeight(category, subcategory) {
    const weights = {
      passive: {
        resistor: 0.1,
        capacitor: 1.5,
        inductor: 8.0,
        transformer: 250.0,
        oscillator: 1.0
      },
      semiconductor: {
        diode: 0.3,
        transistor: 1.2,
        ic: 2.0,
        sensor: 1.5
      },
      electromechanical: {
        relay: 12.0,
        switch: 4.0,
        motor: 75.0,
        audio: 15.0
      },
      connector: {
        port: 5.0,
        header: 2.0,
        terminal: 6.0
      },
      power: {
        battery: 45.0,
        protection: 1.0,
        cooling: 35.0
      },
      display: {
        monitor: 1500.0,
        led: 3.0
      }
    };

    if (weights[category] && weights[category][subcategory]) {
      return weights[category][subcategory];
    }
    return 2.0; // Default weight 2 grams
  }

  // Aggregate a list of analyzed components into high-level stats
  static aggregateStats(analyzedList) {
    let totalItems = 0;
    let uniqueComponents = analyzedList.length;
    let totalValue = 0;
    let totalWeightDiverted = 0; // grams
    
    let salvageableCount = 0;
    let recyclableCount = 0;
    let hazardousCount = 0;

    for (const item of analyzedList) {
      const qty = item.quantity;
      totalItems += qty;
      totalValue += (item.component.estimatedValue * qty);
      
      const unitWeight = ComponentAnalyzer.getComponentWeight(item.component.category, item.component.subcategory);
      totalWeightDiverted += (unitWeight * qty);

      if (item.component.classification === 'salvageable') {
        salvageableCount += qty;
      } else if (item.component.classification === 'recyclable') {
        recyclableCount += qty;
      } else if (item.component.classification === 'hazardous') {
        hazardousCount += qty;
      }
    }

    // Convert grams to kg if large enough
    const weightText = totalWeightDiverted >= 1000 
      ? `${(totalWeightDiverted / 1000).toFixed(2)} kg` 
      : `${totalWeightDiverted.toFixed(1)} g`;

    return {
      totalItems,
      uniqueComponents,
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalWeightGrams: totalWeightDiverted,
      weightText,
      salvageableCount,
      recyclableCount,
      hazardousCount
    };
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentAnalyzer;
} else {
  window.ComponentAnalyzer = ComponentAnalyzer;
}
