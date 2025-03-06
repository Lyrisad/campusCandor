function doGet(e) {
    var action = e.parameter.action;
    var result = {};
  
    try {
      // Ouvrir la feuille de calcul
      var ss = SpreadsheetApp.openById(
        "1J7s8dl-eEn_An1VY5K3cVKYdF3dOWZRSsYtRWbQ4Z_w"
      );
  
      if (action == "read") {
        // Lecture de l'onglet "Formations"
        var sheet = ss.getSheetByName("Formations");
        var data = sheet.getDataRange().getValues();
        // La première ligne est l'en-tête
        result.values = data.slice(1).map(function (row) {
          return {
            id: row[0],
            name: row[1],
            availableDates: row[2],
            participants: row[3],
          };
        });
      } else if (action == "add") {
        // Ajout d'une formation dans "Formations"
        var sheet = ss.getSheetByName("Formations");
        var id = e.parameter.id;
        var name = e.parameter.name;
        var dates = e.parameter.dates;
        // La colonne Participants est initialisée vide
        sheet.appendRow([id, name, dates, ""]);
        result.success = true;
      } else if (action == "update") {
        // Mise à jour d'une formation dans "Formations"
        var sheet = ss.getSheetByName("Formations");
        var id = parseInt(e.parameter.id);
        var name = e.parameter.name;
        var dates = e.parameter.dates;
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            sheet.getRange(i + 1, 2).setValue(name);
            sheet.getRange(i + 1, 3).setValue(dates);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found) result.error = "Formation non trouvée";
      } else if (action == "delete") {
        // Suppression d'une formation dans "Formations"
        var sheet = ss.getSheetByName("Formations");
        var id = parseInt(e.parameter.id);
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            sheet.deleteRow(i + 1);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found) result.error = "Formation non trouvée";
      } else if (action == "readPending") {
        // Lecture des demandes en attente dans "Demandes"
        var sheet = ss.getSheetByName("Demandes");
        var data = sheet.getDataRange().getValues();
        // En-tête: ID, MANAGEUR, EMAIL, TELEPHONE, FORMATION, DATE, MESSAGE, EMPLOYEES
        result.values = data.slice(1).map(function (row) {
          return {
            id: row[0],
            manager: row[1],
            email: row[2],
            telephone: row[3],
            formation: row[4],
            date: row[5],
            message: row[6],
            employees: row[7],
          };
        });
      } else if (action == "addPending") {
        // Ajout d'une demande dans "Demandes"
        var sheet = ss.getSheetByName("Demandes");
        var data = sheet.getDataRange().getValues();
        var newId = 1;
        if (data.length > 1) {
          var ids = data.slice(1).map(function (row) {
            return parseInt(row[0]);
          });
          newId = Math.max.apply(null, ids) + 1;
        }
        var manager = e.parameter.manager;
        var email = e.parameter.email;
        var telephone = e.parameter.telephone;
        var formation = e.parameter.formation;
        var date = e.parameter.date;
        var message = e.parameter.message;
        var employees = e.parameter.employees;
        sheet.appendRow([
          newId,
          manager,
          email,
          telephone,
          formation,
          date,
          message,
          employees,
        ]);
        result.success = true;
      } else if (action == "deletePending") {
        // Suppression d'une demande dans "Demandes"
        var sheet = ss.getSheetByName("Demandes");
        var id = parseInt(e.parameter.id);
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            sheet.deleteRow(i + 1);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found) result.error = "Demande non trouvée";
      } else if (action == "accept") {
        // Acceptation d'une demande : lire la demande dans "Demandes" et mettre à jour "Formations"
        var demandesSheet = ss.getSheetByName("Demandes");
        var formationsSheet = ss.getSheetByName("Formations");
        var id = parseInt(e.parameter.id);
        var dataD = demandesSheet.getDataRange().getValues();
        var request = null;
        var rowIndex = null;
        for (var i = 1; i < dataD.length; i++) {
          if (parseInt(dataD[i][0]) === id) {
            request = {
              id: dataD[i][0],
              manager: dataD[i][1],
              email: dataD[i][2],
              telephone: dataD[i][3],
              formation: dataD[i][4],
              date: dataD[i][5],
              message: dataD[i][6],
              employees: dataD[i][7],
            };
            rowIndex = i + 1;
            break;
          }
        }
        if (request == null) {
          result.error = "Demande non trouvée";
        } else {
          // Recherche de la formation correspondante dans "Formations" par le nom (colonne B)
          var dataF = formationsSheet.getDataRange().getValues();
          var found = false;
          for (var j = 1; j < dataF.length; j++) {
            if (dataF[j][1] == request.formation) {
              // Récupérer la colonne Participants (colonne D)
              var existing = dataF[j][3];
              // --- Modification ici ---
              // Parse des données employés de la demande.
              var empData = JSON.parse(request.employees);
              var blocksToAdd = [];
              if (Array.isArray(empData)) {
                // Pour chaque employé, créer un bloc avec la date
                for (var k = 0; k < empData.length; k++) {
                  blocksToAdd.push(
                    JSON.stringify([empData[k]]) + " (" + request.date + ")"
                  );
                }
              } else {
                blocksToAdd.push(
                  JSON.stringify([empData]) + " (" + request.date + ")"
                );
              }
              // Concaténer les nouveaux blocs avec une virgule.
              var newParticipant = blocksToAdd.join(", ");
              var updated = existing
                ? existing + ", " + newParticipant
                : newParticipant;
              formationsSheet.getRange(j + 1, 4).setValue(updated);
              found = true;
              break;
            }
          }
          if (found) {
            // Supprimer la demande acceptée
            demandesSheet.deleteRow(rowIndex);
            result.success = true;
          } else {
            result.error = "Formation non trouvée pour la demande";
          }
        }
      } else if (action == "updateParticipants") {
        // Mise à jour des participants dans la formation
        var sheet = ss.getSheetByName("Formations");
        var id = parseInt(e.parameter.id);
        var newParticipants = e.parameter.participants;
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            // Mise à jour de la colonne Participants (colonne D)
            sheet.getRange(i + 1, 4).setValue(newParticipants);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found)
          result.error =
            "Formation non trouvée pour la mise à jour des participants";
      } else if (action == "archive") {
        var sheetFormations = ss.getSheetByName("Formations");
        var sheetArchives = ss.getSheetByName("Archives");
        // Récupérer toutes les lignes (en-tête en ligne 1)
        var dataRange = sheetFormations.getDataRange();
        var data = dataRange.getValues();
        var today = new Date();
        var rowsToDelete = [];
  
        // Traiter chaque ligne de formation (à partir de la ligne 2)
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          var formationId = row[0];
          var formationName = row[1];
          // Formatage de availableDates : si c'est un objet Date, on le formate ; sinon, on utilise sa valeur en chaîne.
          var availableDates = "";
          if (row[2]) {
            if (Object.prototype.toString.call(row[2]) === "[object Date]") {
              availableDates = Utilities.formatDate(
                row[2],
                Session.getScriptTimeZone(),
                "dd/MM/yyyy"
              );
            } else {
              availableDates = row[2].toString().trim();
            }
          }
          var participants = row[3] ? row[3].toString().trim() : "";
  
          // Découper availableDates par virgule
          var datesArray = availableDates
            ? availableDates.split(",").map(function (s) {
                return s.trim();
              })
            : [];
  
          var datesToKeep = [];
          var datesToArchive = [];
  
          // Vérifier chaque date (format supposé : dd/MM/yyyy)
          for (var j = 0; j < datesArray.length; j++) {
            var dateStr = datesArray[j];
            var parts = dateStr.split("/");
            if (parts.length === 3) {
              var d = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0])
              );
              // Si la date est passée, on l'archive
              if (d < today) {
                datesToArchive.push(dateStr);
              } else {
                datesToKeep.push(dateStr);
              }
            } else {
              datesToKeep.push(dateStr);
            }
          }
  
          if (datesToArchive.length > 0) {
            // Traitement de la colonne Participants.
            // Les blocs participants doivent suivre le format : [ ... ] (date)
            var regex = /(\[.*?\])\s*\((.*?)\)/g;
            var match;
            var remainingBlocks = [];
            var archiveEntries = [];
  
            while ((match = regex.exec(participants)) !== null) {
              var blockJson = match[1];
              var blockDateRaw = match[2].trim();
              // Conversion de la date du bloc : si elle contient "/" on la considère déjà au format dd/MM/yyyy.
              var blockDateFormatted = "";
              if (blockDateRaw.indexOf("/") !== -1) {
                blockDateFormatted = blockDateRaw;
              } else {
                var blockDateObj = new Date(blockDateRaw);
                if (!isNaN(blockDateObj)) {
                  blockDateFormatted = Utilities.formatDate(
                    blockDateObj,
                    Session.getScriptTimeZone(),
                    "dd/MM/yyyy"
                  );
                } else {
                  blockDateFormatted = blockDateRaw;
                }
              }
              // Si la date formatée du bloc figure dans datesToArchive...
              if (datesToArchive.indexOf(blockDateFormatted) !== -1) {
                archiveEntries.push({
                  date: blockDateFormatted,
                  block: blockJson,
                });
              } else {
                remainingBlocks.push(match[0]);
              }
            }
  
            // Grouper les blocs archivés par date
            var grouped = {};
            for (var k = 0; k < archiveEntries.length; k++) {
              var dt = archiveEntries[k].date;
              if (!grouped[dt]) {
                grouped[dt] = [];
              }
              grouped[dt].push(archiveEntries[k].block);
            }
  
            // Pour chaque date passée, ajouter une ligne dans Archives.
            // On utilise "|||" comme délimiteur pour séparer les blocs.
            for (var dt in grouped) {
              var archivedParticipants = grouped[dt].join("|||");
              sheetArchives.appendRow([
                formationId,
                formationName,
                dt,
                archivedParticipants,
              ]);
            }
  
            // Mise à jour de la ligne de formation avec les dates futures et les blocs restants.
            var newAvailableDates = datesToKeep.join(", ");
            var newParticipants = remainingBlocks.join(", ");
            sheetFormations.getRange(i + 1, 3).setValue(newAvailableDates);
            sheetFormations.getRange(i + 1, 4).setValue(newParticipants);
  
            // Si aucune date ne reste, on marque la ligne pour suppression.
            if (!newAvailableDates) {
              rowsToDelete.push(i + 1);
            }
          }
        }
  
        // Suppression des lignes en ordre décroissant (pour ne pas modifier les index)
        rowsToDelete.sort(function (a, b) {
          return b - a;
        });
        for (var d = 0; d < rowsToDelete.length; d++) {
          sheetFormations.deleteRow(rowsToDelete[d]);
        }
  
        result.success = true;
      } else if (action == "readArchives") {
        var sheet = ss.getSheetByName("Archives");
        var data = sheet.getDataRange().getValues();
        // En supposant que la première ligne est l'en-tête
        result.values = data.slice(1).map(function (row) {
          return {
            id: row[0],
            formation: row[1],
            date: row[2],
            participants: row[3],
          };
        });
      }
      // MODULE TÂCHES
      else if (action == "addTask") {
        var sheet = ss.getSheetByName("Taches");
        var data = sheet.getDataRange().getValues();
        var newId = 1;
        if (data.length > 1) {
          var ids = data.slice(1).map(function (row) {
            return parseInt(row[0]);
          });
          newId = Math.max.apply(null, ids) + 1;
        }
        var concerne = e.parameter.concerne;
        var tache = e.parameter.tache;
        var importance = e.parameter.importance;
        // Forcer l'état à "Due" lors de la création
        var etat = "Due";
        sheet.appendRow([newId, concerne, tache, importance, etat]);
        result.success = true;
      } else if (action == "readTasks") {
        var sheet = ss.getSheetByName("Taches");
        var data = sheet.getDataRange().getValues();
        // Filtrer les lignes dont l'état est "Due"
        result.values = data
          .slice(1)
          .filter(function (row) {
            return row[4] === "Due";
          })
          .map(function (row) {
            return {
              id: row[0],
              concerne: row[1],
              tache: row[2],
              importance: row[3],
              etat: row[4],
            };
          });
      } else if (action == "readTasksHistory") {
        var sheet = ss.getSheetByName("Taches");
        var data = sheet.getDataRange().getValues();
        // Filtrer les lignes dont l'état est "Accomplie"
        result.values = data
          .slice(1)
          .filter(function (row) {
            return row[4] === "Accomplie";
          })
          .map(function (row) {
            return {
              id: row[0],
              concerne: row[1],
              tache: row[2],
              importance: row[3],
              etat: row[4],
            };
          });
      } else if (action == "deleteTask") {
        var sheet = ss.getSheetByName("Taches");
        var id = parseInt(e.parameter.id);
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            sheet.deleteRow(i + 1);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found) result.error = "Tâche non trouvée";
      } else if (action == "updateTaskState") {
        // Mise à jour de l'état d'une tâche (passer de "Due" à "Accomplie", par exemple)
        var sheet = ss.getSheetByName("Taches");
        var id = parseInt(e.parameter.id);
        var newEtat = e.parameter.etat; // Attendu "Accomplie" ou autre valeur si besoin
        var data = sheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (parseInt(data[i][0]) === id) {
            sheet.getRange(i + 1, 5).setValue(newEtat);
            found = true;
            break;
          }
        }
        result.success = found;
        if (!found) result.error = "Tâche non trouvée pour mise à jour de l'état";
      } else if (action == "clearTasksHistory") {
        var sheet = ss.getSheetByName("Taches");
        var data = sheet.getDataRange().getValues();
        var rowsToDelete = [];
        // Identifier les lignes dont l'état est "Accomplie"
        for (var i = 1; i < data.length; i++) {
          if (data[i][4] === "Accomplie") {
            rowsToDelete.push(i + 1);
          }
        }
        // Supprimer les lignes en ordre décroissant
        rowsToDelete.sort(function (a, b) {
          return b - a;
        });
        for (var j = 0; j < rowsToDelete.length; j++) {
          sheet.deleteRow(rowsToDelete[j]);
        }
        result.success = true;
      } else {
        result.error = "Action non reconnue";
      }
    } catch (err) {
      result.error = err.toString();
    }
  
    var output = JSON.stringify(result);
    if (e.parameter.callback) {
      output = e.parameter.callback + "(" + output + ")";
      return ContentService.createTextOutput(output).setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
    }
    return ContentService.createTextOutput(output).setMimeType(
      ContentService.MimeType.JSON
    );
  }
  