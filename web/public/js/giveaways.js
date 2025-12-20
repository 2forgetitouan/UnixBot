document.addEventListener('DOMContentLoaded', () => {
  let openDetailsIds = new Set(); // Tracker les details ouverts

  loadGiveaways();
  setInterval(loadGiveaways, 5000); // Rafraîchir toutes les 5 secondes
  
  // Mettre à jour les compteurs de temps toutes les secondes
  setInterval(updateTimeDisplays, 1000);

  function updateTimeDisplays() {
    document.querySelectorAll('[data-end-time]').forEach(element => {
      const endTime = parseInt(element.dataset.endTime);
      element.innerHTML = formatTimeLeft(endTime);
    });
  }

  function loadGiveaways() {
    fetch('/giveaways')
      .then(res => res.json())
      .then(data => {
        displayGiveaways(data.giveaways || []);
        attachEditHandlers();
        
        // Attacher les événements toggle après le rendu
        document.querySelectorAll('.participants-details').forEach(details => {
          details.addEventListener('toggle', (e) => {
            const giveawayCard = e.target.closest('.giveaway-card');
            const messageId = giveawayCard?.dataset.messageId;
            if (messageId) {
              if (e.target.open) {
                openDetailsIds.add(messageId);
              } else {
                openDetailsIds.delete(messageId);
              }
            }
          });
        });
      })
      .catch(err => {
        console.error('Erreur chargement giveaways:', err);
        document.getElementById('giveaways-list').innerHTML = 
          '<div class="error">❌ Erreur de chargement</div>';
      });
  }

  function displayGiveaways(giveaways) {
    const container = document.getElementById('giveaways-list');
    
    if (giveaways.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucun giveaway pour le moment</div>';
      openDetailsIds.clear();
      return;
    }

    container.innerHTML = giveaways.map(g => {
      const timeLeft = formatTimeLeft(g.endTime);
      const participantsCount = g.participants ? g.participants.length : 0;
      const isOpen = openDetailsIds.has(g.messageId) ? 'open' : '';
      const endDate = new Date(g.endTime).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="giveaway-card" data-message-id="${g.messageId}">
          <div class="giveaway-header">
            <h3>🎁 ${escapeHtml(g.prize)}</h3>
            <div class="giveaway-actions">
              <button class="btn-edit" data-message-id="${g.messageId}" data-prize="${escapeAttribute(g.prize)}" data-winners="${g.winnersCount}" data-end="${g.endTime}">✏️</button>
              <button class="btn-delete" data-delete="${g.messageId}" onclick="deleteGiveaway('${g.messageId}')">🗑️</button>
            </div>
          </div>
          
          <div class="giveaway-info">
            <div class="info-item">
              <span class="label">👑 Gagnants</span>
              <span class="value">${g.winnersCount}</span>
            </div>
            <div class="info-item">
              <span class="label">⏱️ Temps restant</span>
              <span class="value" data-end-time="${g.endTime}">${timeLeft}</span>
            </div>
            <div class="info-item">
              <span class="label">📅 Date de fin</span>
              <span class="value">${endDate}</span>
            </div>
            <div class="info-item">
              <span class="label">👥 Participants</span>
              <span class="value">${participantsCount}</span>
            </div>
            <div class="info-item">
              <span class="label">📺 Salon</span>
              <span class="value">#${escapeHtml(g.channelName || 'Inconnu')}</span>
            </div>
            <div class="info-item">
              <span class="label">👤 Organisateur</span>
              <span class="value">${escapeHtml(g.organizerName || 'Inconnu')}</span>
            </div>
          </div>

          <details class="participants-details" ${isOpen}>
            <summary>👥 Voir les participants (${participantsCount})</summary>
            <div class="participants-list">
              ${g.participantsDetails && g.participantsDetails.length > 0 
                ? g.participantsDetails.map(p => `
                  <div class="participant-card">
                    <img src="${p.avatar}" alt="${escapeHtml(p.username)}" class="participant-avatar">
                    <div class="participant-info">
                      <div class="participant-name">${escapeHtml(p.username)}</div>
                      <div class="participant-tag">${escapeHtml(p.tag)}</div>
                      <div class="participant-meta">
                        <span title="Date de création du compte">📅 ${new Date(p.createdAt).toLocaleDateString()}</span>
                        <span title="Date de join du serveur">🚪 ${new Date(p.joinedAt).toLocaleDateString()}</span>
                      </div>
                      <div class="participant-id">ID: ${p.id}</div>
                    </div>
                  </div>
                `).join('')
                : '<div class="empty-participants">Aucun participant</div>'}
            </div>
          </details>
        </div>
      `;
    }).join('');
  }

  function formatTimeLeft(endTime) {
    const now = Date.now();
    const diff = endTime - now;

    if (diff <= 0) return '<span style="color: #ff4444; font-weight: bold;">🔴 TERMINÉ</span>';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}min ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}min ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttribute(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function attachEditHandlers() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.onclick = () => openEditModal({
        messageId: btn.dataset.messageId,
        prize: btn.dataset.prize || '',
        winnersCount: parseInt(btn.dataset.winners || '1', 10),
        endTime: parseInt(btn.dataset.end || '0', 10)
      });
    });
  }

  function openEditModal(giveaway) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const endValue = giveaway.endTime ? formatLocalDateTime(giveaway.endTime) : '';

    overlay.innerHTML = `
      <div class="modal">
        <h3>Modifier le giveaway</h3>
        <label class="modal-field">
          <span>Lot</span>
          <input type="text" id="edit-prize" value="${escapeAttribute(giveaway.prize)}" />
        </label>
        <label class="modal-field">
          <span>Nombre de gagnants</span>
          <input type="number" id="edit-winners" min="1" value="${giveaway.winnersCount || 1}" />
        </label>
        <label class="modal-field">
          <span>Date de fin</span>
          <input type="datetime-local" id="edit-end" value="${endValue}" />
        </label>
        <div class="modal-actions">
          <button class="btn-secondary" id="cancel-edit">Annuler</button>
          <button class="btn-primary" id="save-edit">Enregistrer</button>
        </div>
      </div>
    `;

    overlay.querySelector('#cancel-edit').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#save-edit').onclick = () => submitEdit(giveaway.messageId);

    document.body.appendChild(overlay);
  }

  function submitEdit(messageId) {
    const prize = document.getElementById('edit-prize').value.trim();
    const winnersCount = parseInt(document.getElementById('edit-winners').value, 10);
    const endInput = document.getElementById('edit-end').value;
    const endTime = endInput ? Date.parse(endInput) : undefined;

    if (!prize) {
      showToast('Le lot est obligatoire', 'error');
      return;
    }

    if (Number.isNaN(winnersCount) || winnersCount < 1) {
      showToast('Nombre de gagnants invalide', 'error');
      return;
    }

    const payload = { prize, winnersCount };
    if (!Number.isNaN(endTime)) {
      payload.endTime = endTime;
    }

    fetch(`/giveaway/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Giveaway mis à jour', 'success');
          const modal = document.querySelector('.modal-overlay');
          if (modal) modal.remove();
          loadGiveaways();
        } else {
          showToast(data.message || 'Erreur lors de la mise à jour', 'error');
        }
      })
      .catch(() => {
        showToast('Erreur lors de la mise à jour', 'error');
      });
  }

  window.deleteGiveaway = function(messageId) {
    handleDeleteWithConfirm(messageId);
  };

  const deleteConfirm = {};

  function handleDeleteWithConfirm(messageId) {
    const btn = document.querySelector(`button[data-delete="${messageId}"]`);

    if (!deleteConfirm[messageId]) {
      deleteConfirm[messageId] = setTimeout(() => {
        delete deleteConfirm[messageId];
        if (btn) {
          btn.textContent = '🗑️';
          btn.classList.remove('confirm');
        }
      }, 2000);
      if (btn) {
        btn.textContent = 'Confirmer';
        btn.classList.add('confirm');
      }
      showToast('Cliquez à nouveau pour confirmer la suppression', 'info');
      return;
    }

    clearTimeout(deleteConfirm[messageId]);
    delete deleteConfirm[messageId];
    if (btn) {
      btn.textContent = '🗑️';
      btn.classList.remove('confirm');
    }

    fetch(`/giveaway/${messageId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Giveaway annulé avec succès', 'success');
          loadGiveaways();
        } else {
          showToast(data.message, 'error');
        }
      })
      .catch(err => {
        console.error('Erreur:', err);
        showToast('Erreur lors de l\'annulation', 'error');
      });
  }

  function formatLocalDateTime(ms) {
    const d = new Date(ms);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✗',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
});
