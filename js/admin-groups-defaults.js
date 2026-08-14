(function () {
  'use strict';

  var DEFAULT_ACRONYMS = [
    // Accommodations & Pedagogical
    { code: 'PAP', label: 'Personalized Support Plan (PAP)', labelFr: 'Plan d\'Accompagnement Personnalisé', category: 'pedagogy', aliases: ['pap', 'plan accompagnement personnalisé', 'personalized support'] },
    { code: 'PPRE', label: 'Personalized Educational Success Program (PPRE)', labelFr: 'Programme Personnalisé de Réussite Éducative', category: 'pedagogy', aliases: ['ppre', 'educational success'] },
    { code: 'PAI', label: 'Individualized Health Protocol (PAI / Medical)', labelFr: 'Projet d\'Accueil Individualisé (Médical / Allergies)', category: 'medical', aliases: ['pai', 'projet accueil individualise', 'medical', 'allergie', 'health'] },
    { code: 'PPS', label: 'Personalized Schooling Project (PPS)', labelFr: 'Projet Personnalisé de Scolarisation', category: 'pedagogy', aliases: ['pps', 'schooling project'] },
    { code: 'GEVASCO', label: 'Compensation Assessment Guide (GEVASCO)', labelFr: 'Guide d\'Évaluation des Besoins de Compensation', category: 'pedagogy', aliases: ['gevasco'] },
    { code: 'TDAH', label: 'Attention Deficit Hyperactivity Disorder (ADHD)', labelFr: 'Trouble Déficit de l\'Attention / Hyperactivité', category: 'pedagogy', aliases: ['tdah', 'adhd', 'attention'] },
    { code: 'DYS', label: 'Specific Learning Difficulties (DYS / Dyslexia)', labelFr: 'Troubles DYS (Dyslexie, Dyspraxie, Dysorthographie)', category: 'pedagogy', aliases: ['dys', 'dyslexie', 'dyspraxie', 'dysorthographie', 'dyslexia'] },
    { code: '1/3 T', label: 'Extra Time Accommodation (1/3 time)', labelFr: 'Tiers-temps supplémentaire', category: 'pedagogy', aliases: ['1/3 t', '1/3 temps', 'tiers temps', 'extra time', '1/3 time'] },
    { code: 'AESH', label: 'Special Educational Needs Assistant (AESH / AVS)', labelFr: 'Accompagnant d\'Élève en Situation de Handicap (AVS)', category: 'pedagogy', aliases: ['aesh', 'avs', 'assistant', 'aide'] },

    // Regimen & School Life
    { code: 'DP', label: 'Half-boarder / Day-boarder (DP)', labelFr: 'Demi-Pensionnaire', category: 'regime', aliases: ['dp', 'demi pensionnaire', 'demi-pension', 'half boarder', 'day boarder'] },
    { code: 'EXT', label: 'Day-student / Non-boarder (EXT)', labelFr: 'Externe', category: 'regime', aliases: ['ext', 'externe', 'day student'] },
    { code: 'INT', label: 'Boarder / Resident (INT)', labelFr: 'Interne (Internat)', category: 'regime', aliases: ['int', 'interne', 'internat', 'boarder'] },
    { code: 'AUT', label: 'Authorized Exit (AUT)', labelFr: 'Sortie Autorisée', category: 'exit', aliases: ['aut', 'autorise', 'sortie libre', 'authorized'] },
    { code: 'ACC', label: 'Accompanied Exit (ACC)', labelFr: 'Sortie Accompagnée / Réglementée', category: 'exit', aliases: ['acc', 'accompagne', 'sortie reglementee', 'accompanied'] },
    { code: 'INE', label: 'Student Identification Number (INE / ID)', labelFr: 'Identifiant National Élève / Matricule', category: 'admin', aliases: ['ine', 'matricule', 'id', 'student id', 'num élève'] },

    // Discipline & Tracking
    { code: 'RET', label: 'Late Arrival (RET)', labelFr: 'Retard', category: 'discipline', aliases: ['ret', 'retard', 'late'] },
    { code: 'EXCL', label: 'Class Dismissal (EXCL)', labelFr: 'Exclusion de cours', category: 'discipline', aliases: ['excl', 'exclusion', 'dismissed'] },
    { code: 'DNF', label: 'Homework Missing (DNF)', labelFr: 'Devoir non fait', category: 'discipline', aliases: ['dnf', 'devoir non fait', 'oubli devoir', 'no homework', 'missing homework'] },
    { code: 'OM', label: 'Supplies Forgotten (OM)', labelFr: 'Oubli de matériel', category: 'discipline', aliases: ['om', 'oubli materiel', 'oubli matériel', 'no equipment', 'missing supplies'] },
    { code: 'BAV', label: 'Disruptive Conduct / Chatting (BAV)', labelFr: 'Bavardages / Comportement', category: 'discipline', aliases: ['bav', 'bavardage', 'bavardages', 'comportement', 'chatting', 'disruptive'] },
    { code: 'TIG', label: 'Community Service / Responsibility Measure (TIG)', labelFr: 'Mesure de responsabilisation (TIG)', category: 'discipline', aliases: ['tig', 'responsabilisation', 'travail interet general', 'community service'] },
    { code: 'COLL', label: 'Detention (COLL)', labelFr: 'Heure de retenue / Colle', category: 'discipline', aliases: ['coll', 'colle', 'retenue', 'detention'] }
  ];

  var DEFAULT_INFRACTIONS = [
    { key: 'lates', name: 'Late Arrivals', nameFr: 'Retards', weight: 1, icon: 'clock' },
    { key: 'missingHomework', name: 'Missing Homework', nameFr: 'Devoirs non faits', weight: 2, icon: 'note' },
    { key: 'missingMaterial', name: 'Missing Supplies', nameFr: 'Oublis de matériel', weight: 1, icon: 'edit-word' },
    { key: 'disruptive', name: 'Disruptive Conduct', nameFr: 'Bavardages / Comportement', weight: 2, icon: 'chat' },
    { key: 'dismissals', name: 'Dismissed from Class', nameFr: 'Exclusions de cours', weight: 5, icon: 'error' },
    { key: 'unexcusedAbsence', name: 'Unexcused Absences', nameFr: 'Absences non justifiées', weight: 3, icon: 'close' }
  ];

  var DEFAULT_SANCTION_TIERS = [
    {
      id: 'tier1',
      minPoints: 3,
      maxPoints: 5,
      periodScope: 'all',
      name: 'Extra Homework / Reflection Sheet',
      nameFr: 'Devoir supplémentaire / Fiche de réflexion',
      icon: 'note',
      badgeClass: 'badge-tier1'
    },
    {
      id: 'tier2',
      minPoints: 6,
      maxPoints: 8,
      periodScope: 'all',
      name: 'Detention (1h)',
      nameFr: 'Heure de retenue (1h)',
      icon: 'clock',
      badgeClass: 'badge-tier2'
    },
    {
      id: 'tier3',
      minPoints: 9,
      maxPoints: 12,
      periodScope: 'all',
      name: 'Community Service (TIG)',
      nameFr: 'Mesure de responsabilisation (TIG)',
      icon: 'user-check',
      badgeClass: 'badge-tier3'
    },
    {
      id: 'tier4',
      minPoints: 13,
      maxPoints: 999,
      periodScope: 'all',
      name: 'Parent Meeting / Disciplinary Commission',
      nameFr: 'Rendez-vous parents / Commission éducative',
      icon: 'groups',
      badgeClass: 'badge-tier4'
    }
  ];

  var DEFAULT_ACTION_TYPES = [
    { id: 'student-talk', name: '1-on-1 Student Discussion', nameFr: 'Entretien individuel avec l\'élève', icon: 'chat' },
    { id: 'parent-call', name: 'Parent Phone Call / Email', nameFr: 'Appel téléphonique / Courriel aux parents', icon: 'phone' },
    { id: 'parent-meeting', name: 'Meeting with Parents', nameFr: 'Rendez-vous avec les parents', icon: 'groups' },
    { id: 'extra-work', name: 'Extra Work Assigned', nameFr: 'Devoir supplémentaire donné', icon: 'note' },
    { id: 'detention', name: 'Detention Scheduled & Served', nameFr: 'Heure de retenue effectuée', icon: 'clock' },
    { id: 'community-service', name: 'Community Service (TIG)', nameFr: 'Mesure de responsabilisation', icon: 'user-check' },
    { id: 'warning', name: 'Official Warning / Contract', nameFr: 'Avertissement / Contrat d\'objectifs', icon: 'error' },
    { id: 'cpe-referral', name: 'CPE / Principal Referral', nameFr: 'Signalement Vie scolaire / Direction', icon: 'flag' }
  ];

  var DEFAULT_TABS = [
    { id: 'all', name: 'All Columns', nameFr: 'Toutes les colonnes', icon: 'table' },
    { id: 'demographics', name: 'Demographics & Admin', nameFr: 'Démographie & Contact', icon: 'group-editor' },
    { id: 'accommodations', name: 'Health & Accommodations (SEN)', nameFr: 'Santé & Aménagements (PAP)', icon: 'award' },
    { id: 'discipline', name: 'Discipline & Sanctions', nameFr: 'Discipline & Barème', icon: 'clock' }
  ];

  var DEFAULT_COLUMNS = [
    { key: 'student', name: 'Student Name', nameFr: 'Nom de l\'élève', description: 'Full student name - Click to open student profile', descriptionFr: 'Nom complet de l\'élève - Cliquez pour ouvrir la fiche', visible: true, locked: false, tab: 'all', type: 'student' },
    { key: 'adminClass', name: 'Class / Group', nameFr: 'Classe / Groupe', description: 'Administrative class group or division', descriptionFr: 'Classe administrative ou division', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'dob', name: 'Date of Birth (DOB)', nameFr: 'Date de naissance', description: 'Date of birth (YYYY-MM-DD)', descriptionFr: 'Date de naissance', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'age', name: 'Age', nameFr: 'Âge', description: 'Calculated current age of the student', descriptionFr: 'Âge actuel calculé de l\'élève', visible: true, locked: false, tab: 'demographics', type: 'readonly' },
    { key: 'gender', name: 'Gender', nameFr: 'Sexe', description: 'Student gender (F / M)', descriptionFr: 'Sexe de l\'élève (F / M)', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'regime', name: 'Regimen (DP/EXT/INT)', nameFr: 'Régime (DP/EXT/INT)', description: 'School regimen: DP (Half-boarder), EXT (Day-student), INT (Boarder)', descriptionFr: 'Régime scolaire : DP (Demi-pensionnaire), EXT (Externe), INT (Interne)', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'guardian1Name', name: 'Guardian 1 Name', nameFr: 'Nom Responsable 1', description: 'Primary legal guardian full name', descriptionFr: 'Nom du représentant légal principal', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'guardian1Phone', name: 'Guardian 1 Phone', nameFr: 'Téléphone Responsable 1', description: 'Emergency / primary contact phone number', descriptionFr: 'Numéro de téléphone du responsable', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'guardian1Email', name: 'Guardian 1 Email', nameFr: 'Courriel Responsable 1', description: 'Primary guardian email address for communications', descriptionFr: 'Adresse courriel du responsable', visible: true, locked: false, tab: 'demographics', type: 'text' },
    { key: 'sen', name: 'Accommodations (SEN / PAP)', nameFr: 'Aménagements (PAP/PAI)', description: 'Special Educational Needs & accommodations (PAP, PAI, PPRE, PPS, 1/3 Temps)', descriptionFr: 'Aménagements pédagogiques & santé (PAP, PAI, PPRE, PPS, Tiers-temps)', visible: true, locked: false, tab: 'accommodations', type: 'sen', icon: 'award' },
    { key: 'medicalNotes', name: 'Medical Notes / Protocol', nameFr: 'Remarques médicales / PAI', description: 'Medical protocols, allergies, and health emergency notices', descriptionFr: 'Protocoles médicaux, allergies et remarques de santé', visible: true, locked: false, tab: 'accommodations', type: 'text', icon: 'book' },
    { key: 'lates', name: 'Late Arrivals', nameFr: 'Retards', description: 'Late arrival counter (1 point)', descriptionFr: 'Compteur de retards (1 point)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 1, icon: 'clock' },
    { key: 'missingHomework', name: 'Missing Homework', nameFr: 'Devoirs non faits', description: 'Unprepared / missing homework counter (2 points)', descriptionFr: 'Compteur de devoirs non faits (2 points)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 2, icon: 'note' },
    { key: 'missingMaterial', name: 'Missing Supplies', nameFr: 'Oublis de matériel', description: 'Missing school supplies and equipment (1 point)', descriptionFr: 'Compteur d\'oublis de matériel (1 point)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 1, icon: 'edit-word' },
    { key: 'disruptive', name: 'Disruptive Conduct', nameFr: 'Bavardages / Comportement', description: 'Disruptive conduct and chatting in class (2 points)', descriptionFr: 'Bavardages et perturbation de cours (2 points)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 2, icon: 'chat' },
    { key: 'dismissals', name: 'Dismissed from Class', nameFr: 'Exclusions de cours', description: 'Class dismissals / temporary exclusions (5 points)', descriptionFr: 'Exclusions temporaires de cours (5 points)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 5, icon: 'error' },
    { key: 'unexcusedAbsence', name: 'Unexcused Absences', nameFr: 'Absences non justifiées', description: 'Unexcused class absences (3 points)', descriptionFr: 'Absences non justifiées (3 points)', visible: true, locked: false, tab: 'discipline', type: 'infraction', weight: 3, icon: 'close' },
    { key: 'points', name: 'Total Discipline Points', nameFr: 'Points de discipline', description: 'Cumulative discipline points for the selected period', descriptionFr: 'Total des points de barème pour la période sélectionnée', visible: true, locked: false, tab: 'discipline', type: 'points' },
    { key: 'sanction', name: 'Recommended Sanction', nameFr: 'Sanction recommandée', description: 'Recommended sanction tier based on cumulative points threshold', descriptionFr: 'Mesure ou sanction recommandée selon le barème de points', visible: true, locked: false, tab: 'discipline', type: 'sanction' },
    { key: 'actionsHistory', name: 'Follow-up Log Count', nameFr: 'Journal des entretiens', description: 'Total count of logged follow-up actions and meetings', descriptionFr: 'Nombre d\'entretiens et mesures enregistrés', visible: true, locked: false, tab: 'discipline', type: 'actionsHistory' },
    { key: 'manage', name: 'Quick Action Button', nameFr: 'Bouton d\'action rapide', description: 'Quick button to log a new meeting, parent call, or action', descriptionFr: 'Bouton pour consigner rapidement un entretien ou une mesure', visible: true, locked: false, tab: 'discipline', type: 'manage' }
  ];

  var DEFAULT_PERIODS = [
    { id: 'p1', name: 'Period 1 (T1)', nameFr: 'Période 1 (T1)', startDate: '2025-09-01', endDate: '2025-11-28' },
    { id: 'p2', name: 'Period 2 (T2)', nameFr: 'Période 2 (T2)', startDate: '2025-12-01', endDate: '2026-02-27' },
    { id: 'p3', name: 'Period 3 (T3)', nameFr: 'Période 3 (T3)', startDate: '2026-03-02', endDate: '2026-07-04' }
  ];

  window.ADMIN_GROUPS_DEFAULTS = {
    acronyms: DEFAULT_ACRONYMS,
    infractions: DEFAULT_INFRACTIONS,
    sanctionTiers: DEFAULT_SANCTION_TIERS,
    actionTypes: DEFAULT_ACTION_TYPES,
    tabs: DEFAULT_TABS,
    columns: DEFAULT_COLUMNS,
    periods: DEFAULT_PERIODS
  };
})();
