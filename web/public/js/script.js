document.addEventListener('DOMContentLoaded', () => {
  const upcmdZone = document.getElementById('upcmd-zone');
  const downcmdZone = document.getElementById('downcmd-zone');
  const upcmdList = document.getElementById('upcmd-list');
  const downcmdList = document.getElementById('downcmd-list');
  let draggedItem = null;
  let previousLogsContent = '';
  let currentBotStatus = 'stopped';

  // Système de notification toast
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

  // Gestion du statut du bot et des boutons
  function updateBotStatus() {
    fetch('/bot-status')
      .then(res => res.json())
      .then(data => {
        currentBotStatus = data.status;
        const statusEl = document.getElementById('bot-status');
        const btnStart = document.getElementById('btn-start');
        const btnStop = document.getElementById('btn-stop');
        const btnRestart = document.getElementById('btn-restart');
        
        if (data.status === 'running') {
          statusEl.innerHTML = '<span>🟢</span><span>En ligne</span>';
          statusEl.className = 'status-badge online';
          
          // Activer/Désactiver les boutons
          btnStart.disabled = true;
          btnStop.disabled = false;
          btnRestart.disabled = false;
        } else {
          statusEl.innerHTML = '<span>🔴</span><span>Hors ligne</span>';
          statusEl.className = 'status-badge offline';
          
          // Activer/Désactiver les boutons
          btnStart.disabled = false;
          btnStop.disabled = true;
          btnRestart.disabled = true;
        }
      })
      .catch(err => {
        console.error('Erreur récupération statut:', err);
      });
  }

  updateBotStatus();
  setInterval(updateBotStatus, 3000);

  // Gestion des boutons avec confirmation
  let stopConfirmTimeout = null;
  let stopConfirmActive = false;

  document.getElementById('btn-start').addEventListener('click', () => {
    showToast('Démarrage du bot...', 'info');
    fetch('/bot-start', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast(data.message, 'error');
        }
        updateBotStatus();
      })
      .catch(err => {
        showToast('Erreur lors du démarrage', 'error');
        console.error(err);
      });
  });

  document.getElementById('btn-stop').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    
    if (!stopConfirmActive) {
      // Premier clic : demander confirmation
      stopConfirmActive = true;
      btn.classList.add('confirm');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>⚠</span><span>Confirmer ?</span>';
      
      showToast('Cliquez à nouveau pour confirmer l\'arrêt', 'info');
      
      stopConfirmTimeout = setTimeout(() => {
        stopConfirmActive = false;
        btn.classList.remove('confirm');
        btn.innerHTML = originalText;
      }, 3000);
    } else {
      // Deuxième clic : exécuter l'action
      clearTimeout(stopConfirmTimeout);
      stopConfirmActive = false;
      btn.classList.remove('confirm');
      btn.innerHTML = '<span>⏹</span><span>Arrêter</span>';
      
      showToast('Arrêt du bot...', 'info');
      fetch('/bot-stop', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast(data.message, 'success');
          } else {
            showToast(data.message, 'error');
          }
          updateBotStatus();
        })
        .catch(err => {
          showToast('Erreur lors de l\'arrêt', 'error');
          console.error(err);
        });
    }
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    showToast('Redémarrage du bot...', 'info');
    fetch('/bot-restart', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(data.message, 'success');
        } else {
          showToast(data.message, 'error');
        }
        updateBotStatus();
      })
      .catch(err => {
        showToast('Erreur lors du redémarrage', 'error');
        console.error(err);
      });
  });

  // Fonction pour ajouter les événements de drag à un item
  function addDragEvents(item) {
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
<<<<<<< HEAD
      item.classList.add('dragging');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
      e.dataTransfer.setData('text/plain', item.dataset.command);
      setTimeout(() => item.style.display = 'none', 0);
    });
    item.addEventListener('dragend', () => {
<<<<<<< HEAD
      item.classList.remove('dragging');
=======
>>>>>>> a9ed35453c71da9e2250978e8dbdf3d07457c46e
      setTimeout(() => {
        if (draggedItem) draggedItem.style.display = 'block';
      }, 0);
    });
  }

  // Initialiser les événements sur tous les items existants
  document.querySelectorAll('.command-item').forEach(addDragEvents);

  // Gérer le survol des zones de drop
  [upcmdZone, downcmdZone].forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('highlight');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('highlight');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('highlight');
      const commandName = e.dataTransfer.getData('text/plain');
      const fromZone = draggedItem.parentElement.id;
      const toZone = zone.querySelector('ul').id;

      // Empêcher le déplacement des commandes par défaut
      if (window.defaultCommands && window.defaultCommands.includes(commandName)) {
        showToast('Les commandes par défaut ne peuvent pas être désactivées.', 'error');
        return;
      }

      // Déplacer visuellement l'élément
      if (fromZone !== toZone) {
        const newItem = document.createElement('li');
        newItem.className = 'command-item';
        newItem.textContent = commandName;
        newItem.dataset.command = commandName;
        addDragEvents(newItem);

        zone.querySelector('ul').appendChild(newItem);
        draggedItem.remove();

        showToast(`Déplacement de ${commandName}...`, 'info');

        // Envoyer la requête au serveur pour déplacer le fichier
        fetch('/move-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: commandName,
            from: fromZone.replace('-list', ''),
            to: toZone.replace('-list', '')
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showToast(data.message, 'success');
          } else {
            showToast('Erreur lors du déplacement de la commande.', 'error');
            // En cas d'erreur, recharger la page pour resynchroniser
            setTimeout(() => window.location.reload(), 1500);
          }
        })
        .catch(error => {
          console.error('Erreur:', error);
          showToast('Erreur réseau', 'error');
          setTimeout(() => window.location.reload(), 1500);
        });
      }
    });
  });

  // Rafraîchit la console des logs toutes les 2 secondes
  function refreshLogs() {
    fetch('/logs')
      .then(res => res.json())
      .then(logs => {
        const logsList = document.getElementById('logs-list');
        if (!logsList) return;
        
        const newContent = logs.map(log =>
          `<div>
            <span style="color:#a5b4fc;">[${new Date(log.time).toLocaleTimeString()}]</span>
            <span style="color:#facc15;">[${log.type}]</span>
            <span>${log.message}</span>
            ${log.user ? `<span style="color:#38bdf8;"> (${log.user})</span>` : ''}
            ${log.channel ? `<span style="color:#f472b6;"> [#${log.channel}]</span>` : ''}
          </div>`
        ).join('');

        // Ne faire l'auto-scroll que si le contenu a changé
        if (newContent !== previousLogsContent) {
          logsList.innerHTML = newContent;
          previousLogsContent = newContent;
          scrollToBottom();
        }
      });
  }
  setInterval(refreshLogs, 2000);
  refreshLogs();

  // Rafraîchit le tableau des commandes toutes les secondes
  function refreshCommandsTable() {
    fetch('/commands')
      .then(res => res.json())
      .then(commands => {
        const tbody = document.querySelector('table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = commands.map(cmd => `
          <tr>
            <td>${cmd.name}</td>
            <td>${cmd.description}</td>
            <td>${cmd.category}</td>
            <td>${cmd.status}</td>
          </tr>
        `).join('');
      })
      .catch(err => console.error('Erreur refresh commandes:', err));
  }
  setInterval(refreshCommandsTable, 1000);
  refreshCommandsTable();

  function scrollToBottom() {
    const consoleDiv = document.getElementById('console');
    if (consoleDiv) {
      consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
  }

  // Appelle cette fonction à chaque fois que tu ajoutes un nouveau log
  function addLog(message) {
    const consoleDiv = document.getElementById('console');
    if (consoleDiv) {
      const logLine = document.createElement('div');
      logLine.textContent = message;
      consoleDiv.appendChild(logLine);
      scrollToBottom();
    }
  }
});
