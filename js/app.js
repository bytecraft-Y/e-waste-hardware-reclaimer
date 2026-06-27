// E-Waste Hardware Reclaimer - Main Application Logic
// Orchestrates user interaction, state management, and view updates

const ECO_DIY_RECIPES = [
  {
    name: "LED PWM Dimmer / Motor Controller",
    description: "Build a high-efficiency controller to dim LED strips or regulate DC toy motor speeds without wasting heat.",
    difficulty: "Easy",
    required: [
      { subcategory: "transistor", name: "MOSFET", qty: 1 },
      { subcategory: "resistor", name: "Potentiometer", qty: 1 },
      { subcategory: "resistor", name: "Resistor", qty: 1 }
    ],
    schematicTip: "Connect the potentiometer middle pin to the MOSFET gate through a current-limiting resistor to throttle current."
  },
  {
    name: "DIY Active Audio Preamplifier",
    description: "An active pre-amp circuit to boost signals from weak audio inputs or microphones before feeding to speakers.",
    difficulty: "Moderate",
    required: [
      { subcategory: "ic", name: "Op-Amp", qty: 1 },
      { subcategory: "capacitor", name: "Electrolytic Capacitor", qty: 2 },
      { subcategory: "resistor", name: "Resistor", qty: 3 }
    ],
    schematicTip: "Use the electrolytic capacitors on the input and output lines to block DC voltage offset while passing AC audio signals."
  },
  {
    name: "Electronic Morse Code Trainer",
    description: "A simple code key oscillator for learning and practicing Morse code signals.",
    difficulty: "Easy",
    required: [
      { subcategory: "audio", name: "Buzzer", qty: 1 },
      { subcategory: "switch", name: "Tactile Switch", qty: 1 },
      { subcategory: "power", name: "Coin Cell Holder", qty: 1 }
    ],
    schematicTip: "Wire the tactile switch in series between the coin cell holder positive contact and the buzzer positive pin."
  },
  {
    name: "Solar Charging Supercapacitor Bank",
    description: "Store green solar energy in high-capacity supercapacitors. Battery-free, eco-friendly energy reservoir.",
    difficulty: "Hard",
    required: [
      { subcategory: "diode", name: "Schottky Diode", qty: 1 },
      { subcategory: "capacitor", name: "Supercapacitor", qty: 1 },
      { subcategory: "ic", name: "Linear Voltage Regulator", qty: 1 }
    ],
    schematicTip: "Install the Schottky diode in series with the solar panel output to prevent the supercapacitor from discharging back into the solar panel at night."
  },
  {
    name: "Input Overvoltage & Protection Shield",
    description: "A defensive power strip shield to protect delicate microcontroller boards from voltage spikes and surges.",
    difficulty: "Moderate",
    required: [
      { subcategory: "resistor", name: "Varistor", qty: 1 },
      { subcategory: "protection", name: "Fuse", qty: 1 },
      { subcategory: "switch", name: "Toggle Switch", qty: 1 }
    ],
    schematicTip: "Connect the fuse in series on the active power line and mount the Metal Oxide Varistor (MOV) in parallel across the active and neutral inputs."
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Analyzer
  const database = window.COMPONENT_DATABASE || [];
  const analyzer = new ComponentAnalyzer(database);

  // Application State
  let currentList = [];
  let selectedComponent = null;

  // DOM Elements - Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const inputPanes = document.querySelectorAll('.input-pane');

  // DOM Elements - Single Add
  const searchInput = document.getElementById('search-input');
  const suggestionsDropdown = document.getElementById('suggestions-dropdown');
  const singleQtyInput = document.getElementById('single-qty');
  const addSingleBtn = document.getElementById('add-single-btn');

  // DOM Elements - BOM Paste
  const bomTextarea = document.getElementById('bom-textarea');
  const analyzeBomBtn = document.getElementById('analyze-bom-btn');
  const loadSampleBtn = document.getElementById('load-sample-btn');

  // DOM Elements - Quick Picks
  const quickPickContainer = document.getElementById('quick-pick-container');

  // DOM Elements - Statistics
  const statTotalItems = document.getElementById('stat-total-items');
  const statDivertedWeight = document.getElementById('stat-diverted-weight');
  const statTotalValue = document.getElementById('stat-total-value');
  const statHazardCount = document.getElementById('stat-hazard-count');

  // DOM Elements - Columns
  const listSalvageable = document.getElementById('list-salvageable');
  const listRecyclable = document.getElementById('list-recyclable');
  const listHazardous = document.getElementById('list-hazardous');

  // DOM Elements - Counter Badges
  const badgeSalvageable = document.getElementById('badge-salvageable');
  const badgeRecyclable = document.getElementById('badge-recyclable');
  const badgeHazardous = document.getElementById('badge-hazardous');

  // DOM Elements - Drawer Modal
  const overlayDrawer = document.getElementById('overlay-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerClose = document.getElementById('drawer-close');
  const drawerContent = document.getElementById('drawer-content');

  // DOM Elements - Actions
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const recipesGrid = document.getElementById('recipes-grid');

  // DOM Elements - Inventory Modal
  const btnViewInventory = document.getElementById('btn-view-inventory');
  const inventoryModal = document.getElementById('inventory-modal');
  const inventoryModalBackdrop = document.getElementById('inventory-modal-backdrop');
  const inventoryModalClose = document.getElementById('inventory-modal-close');
  const inventorySearchInput = document.getElementById('inventory-search-input');
  const inventoryTableBody = document.getElementById('inventory-table-body');
  const modalEmptyState = document.getElementById('modal-empty-state');

  // --- TAB NAVIGATION ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPane = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      inputPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`pane-${targetPane}`).classList.add('active');
    });
  });

  // --- POPULATE QUICK PICK CHIPS ---
  const popularChips = [
    "Electrolytic Capacitor", "Resistor", "MOSFET", "555 Timer", "Microcontroller", 
    "Relay", "Tactile Switch", "USB Port", "Stepper Motor", "Heatsink", 
    "Buzzer", "LCD Screen", "Linear Voltage Regulator", "Mercury Switch"
  ];

  popularChips.forEach(name => {
    const chip = document.createElement('button');
    chip.className = 'quick-btn';
    chip.textContent = name;
    chip.type = 'button';
    chip.addEventListener('click', () => {
      searchInput.value = name;
      suggestionsDropdown.style.display = 'none';
      singleQtyInput.focus();
    });
    quickPickContainer.appendChild(chip);
  });

  // Helper to normalize strings for matching (removes spacing variations)
  const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\b([a-z]{1,4})\s+(\d+)\b/g, '$1$2')
      .replace(/\b(\d+)\s+([a-z]{1,4})\b/g, '$1$2')
      .trim();
  };

  // --- AUTOCOMPLETE SEARCH DROPDOWN ---
  searchInput.addEventListener('input', () => {
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) {
      suggestionsDropdown.style.display = 'none';
      return;
    }

    const query = rawQuery.toLowerCase();
    const normalizedQuery = normalizeString(rawQuery);

    // Filter database for suggestions matching the query
    const matches = database.filter(item => {
      const nameMatch = item.names.some(alias => {
        const normAlias = normalizeString(alias);
        return alias.toLowerCase().includes(query) || 
               normAlias.includes(normalizedQuery);
      });
      
      return nameMatch ||
             item.subcategory.toLowerCase().includes(query) ||
             item.category.toLowerCase().includes(query);
    }).slice(0, 5); // Limit to top 5 suggestions

    if (matches.length === 0) {
      suggestionsDropdown.style.display = 'none';
      return;
    }

    suggestionsDropdown.innerHTML = '';
    matches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      
      // Determine badge class
      let badgeClass = 'cat-badge-recyclable';
      if (item.classification === 'salvageable') badgeClass = 'cat-badge-salvageable';
      if (item.classification === 'hazardous') badgeClass = 'cat-badge-hazardous';

      div.innerHTML = `
        <span class="suggestion-name">${Utils.escapeHtml(item.names[0])}</span>
        <span class="suggestion-cat ${badgeClass}">${Utils.escapeHtml(item.classification)}</span>
      `;

      div.addEventListener('click', () => {
        searchInput.value = item.names[0];
        suggestionsDropdown.style.display = 'none';
        singleQtyInput.focus();
      });

      suggestionsDropdown.appendChild(div);
    });

    suggestionsDropdown.style.display = 'block';
  });

  // Close suggestion dropdown if clicked outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
      suggestionsDropdown.style.display = 'none';
    }
  });

  // --- ADD SINGLE COMPONENT ---
  const addSingleComponent = () => {
    const text = searchInput.value.trim();
    const qty = parseInt(singleQtyInput.value, 10) || 1;

    if (!text) {
      alert("Please enter a component description first.");
      return;
    }

    // Format query string with quantity prefix to leverage BOM parsing helpers
    const fullLine = `${qty}x ${text}`;
    const result = analyzer.analyzeLine(fullLine);

    if (result) {
      addComponentToList(result);
      searchInput.value = '';
      singleQtyInput.value = '1';
      updateUI();
    }
  };

  addSingleBtn.addEventListener('click', addSingleComponent);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSingleComponent();
    }
  });

  // --- ADD BOM MULTIPLE COMPONENTS ---
  analyzeBomBtn.addEventListener('click', () => {
    const text = bomTextarea.value.trim();
    if (!text) {
      alert("Please paste a list of components or bill of materials.");
      return;
    }

    const results = analyzer.analyzeBOM(text);
    if (results.length === 0) {
      alert("Could not identify any components. Please check the format.");
      return;
    }

    results.forEach(res => addComponentToList(res));
    bomTextarea.value = '';
    updateUI();
    
    // Switch tab back to list or scroll down
    document.querySelector('[data-tab="list"]')?.click();
  });

  // --- SEED SAMPLE DATA ---
  loadSampleBtn.addEventListener('click', () => {
    const sampleBOM = `10x Electrolytic Capacitor
2x Power MOSFET
5x Carbon Film Resistor
1x Bulging Electrolytic Capacitor
1x Old PCB oil capacitor
1x Stepper motor
1x Mercury switch
3x Tactile switch
1x Power transformer
1x ATmega328p microcontroller
2x Heatsink
1x LCD screen`;

    bomTextarea.value = sampleBOM;
  });

  // --- APP STATE MUTATIONS ---
  const addComponentToList = (item) => {
    // Check if component already exists with same name and classification
    const existingIndex = currentList.findIndex(x => 
      x.component.name === item.component.name && 
      x.component.classification === item.component.classification &&
      JSON.stringify(x.conditions) === JSON.stringify(item.conditions)
    );

    if (existingIndex > -1) {
      currentList[existingIndex].quantity += item.quantity;
    } else {
      currentList.push(item);
    }
  };

  const removeComponentFromList = (index) => {
    currentList.splice(index, 1);
    updateUI();
  };

  // --- UPDATE UI RENDER ---
  const updateUI = () => {
    // Separate into categories
    const salvageable = [];
    const recyclable = [];
    const hazardous = [];

    currentList.forEach((item, index) => {
      // Attach index to trace back on removal or selection
      const itemWithIndex = { ...item, originalIndex: index };
      if (item.component.classification === 'salvageable') salvageable.push(itemWithIndex);
      else if (item.component.classification === 'recyclable') recyclable.push(itemWithIndex);
      else if (item.component.classification === 'hazardous') hazardous.push(itemWithIndex);
    });

    // Update Category Counters
    badgeSalvageable.textContent = salvageable.length;
    badgeRecyclable.textContent = recyclable.length;
    badgeHazardous.textContent = hazardous.length;

    // Render Lists
    renderColumn(listSalvageable, salvageable, 'salvageable');
    renderColumn(listRecyclable, recyclable, 'recyclable');
    renderColumn(listHazardous, hazardous, 'hazardous');

    // Aggregate Stats and Animate
    const stats = ComponentAnalyzer.aggregateStats(currentList);
    
    // Dynamic counts
    Utils.animateCount(statTotalItems, stats.totalItems);
    Utils.animateCount(statTotalValue, stats.totalValue, 1000, true);
    Utils.animateCount(statHazardCount, stats.hazardousCount);

    // Diverted weight needs text formatting
    const weightGrams = stats.totalWeightGrams;
    if (weightGrams >= 1000) {
      const kg = parseFloat((weightGrams / 1000).toFixed(2));
      Utils.animateCount(statDivertedWeight, kg, 1000, false, ' kg');
    } else {
      Utils.animateCount(statDivertedWeight, weightGrams, 1000, false, ' g');
    }

    // Enable/Disable Action buttons
    if (currentList.length > 0) {
      btnReset.removeAttribute('disabled');
      btnExport.removeAttribute('disabled');
      btnViewInventory.removeAttribute('disabled');
    } else {
      btnReset.setAttribute('disabled', 'true');
      btnExport.setAttribute('disabled', 'true');
      btnViewInventory.setAttribute('disabled', 'true');
      closeInventoryModal();
    }

    // Live update Project Sandbox
    updateRecipesSandbox();
  };

  // Live match inventory to Green DIY project recipes
  const updateRecipesSandbox = () => {
    recipesGrid.innerHTML = '';
    
    if (currentList.length === 0) {
      recipesGrid.innerHTML = `
        <div class="empty-col-msg" style="grid-column: 1 / -1; padding: 40px 20px;">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          <p>Your Project Sandbox is empty. Add components to automatically match green DIY building recipes!</p>
        </div>
      `;
      return;
    }

    ECO_DIY_RECIPES.forEach(recipe => {
      let totalRequiredQty = 0;
      let totalHavedQty = 0;
      const partStatusList = [];

      recipe.required.forEach(req => {
        totalRequiredQty += req.qty;
        
        // Match parts in currentList by subcategory OR name
        const matches = currentList.filter(item => {
          const comp = item.component;
          const subcatMatch = comp.subcategory.toLowerCase() === req.subcategory.toLowerCase();
          const nameMatch = comp.name.toLowerCase().includes(req.name.toLowerCase());
          // Only reuse safe parts (do not use hazardous parts)
          return (subcatMatch || nameMatch) && comp.classification !== 'hazardous';
        });

        const totalHavedForReq = matches.reduce((sum, item) => sum + item.quantity, 0);
        totalHavedQty += Math.min(totalHavedForReq, req.qty);

        partStatusList.push({
          ...req,
          have: totalHavedForReq,
          satisfied: totalHavedForReq >= req.qty
        });
      });

      const matchPercent = Math.round((totalHavedQty / totalRequiredQty) * 100);
      const isUnlocked = matchPercent === 100;

      const card = document.createElement('div');
      card.className = `recipe-card ${isUnlocked ? 'recipe-unlocked' : ''}`;
      
      const progressFillWidth = `${matchPercent}%`;
      const tipBox = isUnlocked 
        ? `<div class="recipe-tip-box">💡 <strong>Build Tip:</strong> ${Utils.escapeHtml(recipe.schematicTip)}</div>`
        : `<div class="recipe-tip-box" style="background:none; border:none; color:var(--text-muted); padding:0;">Collect all parts to unlock schematics tips.</div>`;

      const partsHtml = partStatusList.map(p => {
        const itemClass = p.satisfied ? 'part-have' : 'part-missing';
        return `
          <li class="recipe-part-item ${itemClass}">
            <span class="recipe-part-dot"></span>
            <span>${p.qty}x ${p.name} (Have: ${p.have}/${p.qty})</span>
          </li>
        `;
      }).join('');

      card.innerHTML = `
        <div>
          <div class="recipe-title">${Utils.escapeHtml(recipe.name)}</div>
          <div class="recipe-desc">${Utils.escapeHtml(recipe.description)}</div>
          
          <div class="recipe-progress-container">
            <div class="recipe-progress-text">
              <span>Match Status</span>
              <span>${matchPercent}%</span>
            </div>
            <div class="recipe-progress-bar">
              <div class="recipe-progress-fill" style="width: ${progressFillWidth}"></div>
            </div>
          </div>
          
          <ul class="recipe-parts-list">
            ${partsHtml}
          </ul>
        </div>
        ${tipBox}
      `;

      recipesGrid.appendChild(card);
    });
  };

  // Render a specific category column
  const renderColumn = (container, list, categoryType) => {
    container.innerHTML = '';

    if (list.length === 0) {
      let icon = '';
      let msg = '';
      if (categoryType === 'salvageable') {
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
        msg = 'No salvageable parts listed. Extract premium microchips, relays, and coils.';
      } else if (categoryType === 'recyclable') {
        icon = `<svg viewBox="0 0 24 24"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z"/></svg>`;
        msg = 'No standard recyclables. Diodes, ceramic caps, and pins go here.';
      } else {
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>`;
        msg = 'No hazardous items flagged. Battery cells and mercury switches appear here.';
      }
      container.innerHTML = `
        <div class="empty-col-msg">
          ${icon}
          <p>${msg}</p>
        </div>
      `;
      return;
    }

    // Calculate aggregated metrics for this column
    const totalQty = list.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = list.reduce((sum, item) => sum + (ComponentAnalyzer.getComponentWeight(item.component.category, item.component.subcategory) * item.quantity), 0);
    const totalVal = list.reduce((sum, item) => sum + (item.component.estimatedValue * item.quantity), 0);

    // Get top 3 items for preview
    const sortedList = [...list].sort((a, b) => b.quantity - a.quantity);
    const previewItems = sortedList.slice(0, 3);

    const previewListHtml = previewItems.map(item => `
      <li class="summary-preview-item">
        <span class="summary-preview-name" title="Click to view details">${Utils.escapeHtml(item.component.name)}</span>
        <span class="summary-preview-qty">${item.quantity}x</span>
      </li>
    `).join('');

    const formattedWeight = totalWeight >= 1000 
      ? `${(totalWeight / 1000).toFixed(2)} kg` 
      : `${Math.round(totalWeight)} g`;

    const summaryCard = document.createElement('div');
    summaryCard.className = 'category-summary-card';
    summaryCard.innerHTML = `
      <div class="summary-preview-list-container" style="flex-grow: 1;">
        <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">Top Items Preview</div>
        <ul class="summary-preview-list">
          ${previewListHtml}
        </ul>
        ${sortedList.length > 3 ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; font-style: italic;">+ ${sortedList.length - 3} more item(s)</div>` : ''}
      </div>
      <div class="summary-metrics-row">
        <span>Qty: <strong>${totalQty}</strong></span>
        <span>Weight: <strong>${formattedWeight}</strong></span>
        <span>Value: <strong>${Utils.formatCurrency(totalVal)}</strong></span>
      </div>
      <button class="btn-card-action">📋 See Full List</button>
    `;

    // Click on preview name opens the detail drawer for that item
    summaryCard.querySelectorAll('.summary-preview-name').forEach((el, idx) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailDrawer(previewItems[idx]);
      });
    });

    // Button click opens the full inventory modal
    summaryCard.querySelector('.btn-card-action').addEventListener('click', () => {
      openInventoryModal();
    });

    container.appendChild(summaryCard);
  };

  // --- INVENTORY MODAL LOGIC & TABLE RENDER ---
  const openInventoryModal = () => {
    inventoryModalBackdrop.classList.add('active');
    inventoryModal.classList.add('open');
    inventorySearchInput.value = '';
    renderInventoryTable();
    inventorySearchInput.focus();
  };

  const closeInventoryModal = () => {
    inventoryModalBackdrop.classList.remove('active');
    inventoryModal.classList.remove('open');
  };

  btnViewInventory.addEventListener('click', openInventoryModal);
  inventoryModalClose.addEventListener('click', closeInventoryModal);
  inventoryModalBackdrop.addEventListener('click', closeInventoryModal);

  inventorySearchInput.addEventListener('input', () => {
    renderInventoryTable();
  });

  const renderInventoryTable = () => {
    inventoryTableBody.innerHTML = '';
    const query = inventorySearchInput.value.trim().toLowerCase();

    // Filter items based on search query
    const filteredItems = currentList.map((item, index) => ({ ...item, originalIndex: index }))
      .filter(item => {
        if (!query) return true;
        const name = item.component.name.toLowerCase();
        const category = item.component.category.toLowerCase();
        const subcategory = item.component.subcategory.toLowerCase();
        const classification = item.component.classification.toLowerCase();
        return name.includes(query) || 
               category.includes(query) || 
               subcategory.includes(query) || 
               classification.includes(query);
      });

    if (filteredItems.length === 0) {
      modalEmptyState.style.display = 'flex';
      return;
    }

    modalEmptyState.style.display = 'none';

    filteredItems.forEach(item => {
      const row = document.createElement('tr');
      
      let badgeClass = 'table-badge-recycle';
      if (item.component.classification === 'salvageable') badgeClass = 'table-badge-salvage';
      if (item.component.classification === 'hazardous') badgeClass = 'table-badge-hazard';

      const valText = item.component.estimatedValue > 0 
        ? Utils.formatCurrency(item.component.estimatedValue * item.quantity) 
        : '$0.00';

      row.innerHTML = `
        <td style="font-family: var(--font-mono); font-weight: 600;">${item.quantity}x</td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); cursor: pointer;" class="item-name-click">${Utils.escapeHtml(item.component.name)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${Utils.escapeHtml(item.component.subcategory)}</div>
        </td>
        <td>${Utils.escapeHtml(item.component.category)}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${Utils.escapeHtml(item.component.package)}</td>
        <td>
          <span class="table-badge ${badgeClass}">${item.component.classification}</span>
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600; color: var(--color-cyan);">${valText}</td>
        <td style="text-align: center;">
          <button class="btn-table-delete" title="Remove Item" data-index="${item.originalIndex}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </td>
      `;

      // Handle item details drawer click
      row.querySelector('.item-name-click').addEventListener('click', () => {
        openDetailDrawer(item);
      });

      // Handle delete button click
      row.querySelector('.btn-table-delete').addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index, 10);
        removeComponentFromList(index);
        renderInventoryTable(); // Re-render table after deletion
      });

      inventoryTableBody.appendChild(row);
    });
  };

  // --- DRAWER DETAILS RENDERING ---
  const openDetailDrawer = (item) => {
    selectedComponent = item;
    const comp = item.component;

    // Classification Badge
    let classificationBadge = `<span class="drawer-badge drawer-badge-recycle">Recyclable</span>`;
    if (comp.classification === 'salvageable') {
      classificationBadge = `<span class="drawer-badge drawer-badge-salvage">🟢 Salvageable (Keep)</span>`;
    } else if (comp.classification === 'hazardous') {
      classificationBadge = `<span class="drawer-badge drawer-badge-hazard">🔴 Hazardous (Disposal)</span>`;
    }

    // Hazards block
    let hazardsBlock = '';
    if (comp.hazards && comp.hazards.length > 0) {
      hazardsBlock = `
        <div class="drawer-row">
          <div class="drawer-label">Hazards Identified</div>
          <div class="drawer-warning">
            <strong>Active Threats:</strong> ${comp.hazards.map(h => Utils.escapeHtml(h)).join(', ')}
          </div>
        </div>
      `;
    }

    // Repurpose list
    let repurposeList = '';
    if (comp.repurposeIdeas && comp.repurposeIdeas.length > 0) {
      repurposeList = `
        <div class="drawer-row">
          <div class="drawer-label">Repurposing Ideas</div>
          <ul class="ideas-list">
            ${comp.repurposeIdeas.map(idea => `<li>${Utils.escapeHtml(idea)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Build the drawer content
    drawerContent.innerHTML = `
      <div class="drawer-row">
        <div class="drawer-label">Component Type</div>
        <div class="drawer-val" style="font-weight: 600; font-size: 16px;">
          ${Utils.escapeHtml(comp.name)}
        </div>
        ${classificationBadge}
      </div>

      <div class="drawer-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div class="drawer-label">Package Form</div>
          <div class="drawer-val" style="text-transform: capitalize;">${Utils.escapeHtml(comp.package)}</div>
        </div>
        <div>
          <div class="drawer-label">Subcategory</div>
          <div class="drawer-val" style="text-transform: capitalize;">${Utils.escapeHtml(comp.subcategory)}</div>
        </div>
      </div>

      <div class="drawer-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div class="drawer-label">Est. Unit Value</div>
          <div class="drawer-val" style="font-weight: bold; color: var(--color-salvage)">
            ${comp.estimatedValue > 0 ? Utils.formatCurrency(comp.estimatedValue) : 'N/A'}
          </div>
        </div>
        <div>
          <div class="drawer-label">Weight Class</div>
          <div class="drawer-val">${ComponentAnalyzer.getComponentWeight(comp.category, comp.subcategory)} g</div>
        </div>
      </div>

      <div class="drawer-row">
        <div class="drawer-label">Desoldering Difficulty</div>
        <span class="diff-badge ${Utils.getDifficultyClass(comp.desolderDifficulty)}">
          ${Utils.getDifficultyLabel(comp.desolderDifficulty)}
        </span>
      </div>

      ${hazardsBlock}
      ${repurposeList}

      <div class="drawer-row">
        <div class="drawer-label">Safety & Handling Notes</div>
        <div class="drawer-val" style="font-size: 13px; color: var(--text-muted);">
          ${Utils.escapeHtml(comp.safetyNotes || 'No specific safety notes. Handle with standard caution.')}
        </div>
      </div>

      <div class="drawer-row">
        <div class="drawer-label">Disposal & Recycling Instructions</div>
        <div class="drawer-val" style="font-size: 13px; color: var(--text-muted);">
          ${Utils.escapeHtml(comp.recyclingInfo || 'Send to local e-waste recycling terminal.')}
        </div>
      </div>
    `;

    // Open animations
    overlayDrawer.classList.add('open');
    drawerBackdrop.classList.add('active');
  };

  const closeDetailDrawer = () => {
    overlayDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
    selectedComponent = null;
  };

  drawerClose.addEventListener('click', closeDetailDrawer);
  drawerBackdrop.addEventListener('click', closeDetailDrawer);

  // --- ACTIONS: RESET & EXPORT ---
  btnReset.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the current component list?")) {
      currentList = [];
      closeDetailDrawer();
      updateUI();
    }
  });

  btnExport.addEventListener('click', () => {
    if (currentList.length === 0) return;
    const stats = ComponentAnalyzer.aggregateStats(currentList);
    Utils.printReport(currentList, stats);
  });

  // --- THEME SELECTOR ---
  const themeDots = document.querySelectorAll('.theme-dot');
  themeDots.forEach(dot => {
    dot.addEventListener('click', () => {
      document.body.classList.remove('theme-cyan', 'theme-amber', 'theme-emerald', 'theme-synthwave');
      themeDots.forEach(d => d.classList.remove('active'));
      
      const theme = dot.dataset.theme;
      document.body.classList.add(`theme-${theme}`);
      dot.classList.add('active');
      
      localStorage.setItem('reclaimer-theme', theme);
    });
  });

  // Load saved theme preference
  const savedTheme = localStorage.getItem('reclaimer-theme');
  if (savedTheme) {
    const activeDot = document.querySelector(`.theme-dot[data-theme="${savedTheme}"]`);
    if (activeDot) {
      document.body.classList.remove('theme-cyan', 'theme-amber', 'theme-emerald', 'theme-synthwave');
      themeDots.forEach(d => d.classList.remove('active'));
      document.body.classList.add(`theme-${savedTheme}`);
      activeDot.classList.add('active');
    }
  }

  // --- ECO-HARDWARE SUSTAINABILITY AGENT LOGIC ---
  const agentChatTrigger = document.getElementById('agent-chat-trigger');
  const agentChatCard = document.getElementById('agent-chat-card');
  const agentMinimizeBtn = document.getElementById('agent-btn-minimize');
  const agentSetupPane = document.getElementById('agent-setup-pane');
  const agentChatBody = document.getElementById('agent-chat-body');
  const agentCardFooter = document.getElementById('agent-card-footer');
  const agentApiKeyInput = document.getElementById('agent-api-key');
  const agentSaveKeyBtn = document.getElementById('btn-save-key');
  const agentMessagesLog = document.getElementById('agent-messages-log');
  const agentInputText = document.getElementById('agent-input-text');
  const agentSendBtn = document.getElementById('btn-send-agent');
  const agentTriggerBadge = document.getElementById('agent-trigger-badge');

  let agentChatHistory = [];
  let agentApiKey = localStorage.getItem('gemini-api-key') || '';

  // Initialize UI state based on saved API key
  if (agentApiKey) {
    agentSetupPane.style.display = 'none';
    agentChatBody.style.display = 'flex';
    agentCardFooter.style.display = 'flex';
  }

  // Toggle chat card
  agentChatTrigger.addEventListener('click', () => {
    agentChatCard.classList.toggle('open');
    if (agentChatCard.classList.contains('open')) {
      agentTriggerBadge.style.display = 'none';
      if (agentApiKey) {
        agentInputText.focus();
      } else {
        agentApiKeyInput.focus();
      }
    }
  });

  agentMinimizeBtn.addEventListener('click', () => {
    agentChatCard.classList.remove('open');
  });

  // Save API Key
  agentSaveKeyBtn.addEventListener('click', () => {
    const key = agentApiKeyInput.value.trim();
    if (!key) {
      alert("Please enter a valid Gemini API Key.");
      return;
    }
    agentApiKey = key;
    localStorage.setItem('gemini-api-key', key);
    agentSetupPane.style.display = 'none';
    agentChatBody.style.display = 'flex';
    agentCardFooter.style.display = 'flex';
    agentInputText.focus();
  });

  // Simple Markdown Parser
  const parseMarkdown = (text) => {
    let escaped = Utils.escapeHtml(text);
    
    // Bold: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code: `code`
    escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Split by lines to parse lists and paragraphs
    const lines = escaped.split('\n');
    let inList = false;
    let resultLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) {
          resultLines.push('<ul>');
          inList = true;
        }
        resultLines.push(`<li>${line.substring(2)}</li>`);
      } else {
        if (inList) {
          resultLines.push('</ul>');
          inList = false;
        }
        if (line) {
          resultLines.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) {
      resultLines.push('</ul>');
    }
    
    return resultLines.join('\n');
  };

  // Add Message to Log
  const addAgentMessage = (content, role) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `agent-msg msg-${role === 'user' ? 'user' : 'assistant'}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'msg-bubble';
    bubbleDiv.innerHTML = role === 'user' ? Utils.escapeHtml(content) : parseMarkdown(content);
    
    msgDiv.appendChild(bubbleDiv);
    agentMessagesLog.appendChild(msgDiv);
    agentMessagesLog.scrollTop = agentMessagesLog.scrollHeight;
  };

  // Get System Instructions
  const getSystemInstructions = () => {
    const inventorySummary = currentList.map(item => 
      `- ${item.quantity}x ${item.component.name} (Subcategory: ${item.component.subcategory}, Package: ${item.component.package}, Classification: ${item.component.classification})`
    ).join('\n') || 'None';

    return `You are the Eco-Hardware Sustainability Agent, a specialist in hardware salvage and sustainable engineering.
Your goal is to analyze electronic components and schematics from discarded electronics and recommend which components can be safely desoldered and reused for new custom hardware projects.
You have real-time awareness of the user's current inventory of salvaged components:
---
${inventorySummary}
---
When the user asks for project ideas, suggest creative projects they can build with their parts.
If the user asks about safety, warn them about toxic elements (lead, beryllium, cadmium, mercury, PCBs) or physical damage (bulging, leaking cells).
Give practical desoldering advice (heatsinking, solder-wick vs pump).
Answer in concise, clear paragraphs. Format responses in clean Markdown.`;
  };

  // Send message to Gemini API
  const sendAgentMessage = async () => {
    const text = agentInputText.value.trim();
    if (!text) return;

    // Clear input
    agentInputText.value = '';
    agentInputText.style.height = '38px';

    // Add user message to log and history
    addAgentMessage(text, 'user');
    agentChatHistory.push({ role: 'user', parts: [{ text: text }] });

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'agent-msg msg-assistant';
    typingIndicator.id = 'agent-typing-indicator';
    typingIndicator.innerHTML = `
      <div class="msg-bubble typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    agentMessagesLog.appendChild(typingIndicator);
    agentMessagesLog.scrollTop = agentMessagesLog.scrollHeight;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${agentApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: agentChatHistory,
          systemInstruction: {
            parts: [{ text: getSystemInstructions() }]
          }
        })
      });

      // Remove typing indicator
      const indicator = document.getElementById('agent-typing-indicator');
      if (indicator) indicator.remove();

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.ok ? await response.json() : null;
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
      
      // Add assistant response to log and history
      addAgentMessage(replyText, 'model');
      agentChatHistory.push({ role: 'model', parts: [{ text: replyText }] });

    } catch (error) {
      // Remove typing indicator
      const indicator = document.getElementById('agent-typing-indicator');
      if (indicator) indicator.remove();

      addAgentMessage(`Error calling Gemini API: ${error.message}. Please verify your API Key and connection.`, 'model');
    }
  };

  // Button Click / Enter Key Bindings
  agentSendBtn.addEventListener('click', sendAgentMessage);
  
  agentInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAgentMessage();
    }
  });

  // Dynamic textarea height
  agentInputText.addEventListener('input', () => {
    agentInputText.style.height = 'auto';
    agentInputText.style.height = `${Math.min(agentInputText.scrollHeight, 100)}px`;
  });

  // Quick Action Chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      agentInputText.value = query;
      sendAgentMessage();
    });
  });

  // Initial load run
  updateUI();
});
