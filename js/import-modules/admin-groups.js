window.IMPORT_MODULE_ADMIN_GROUPS = {
  id: 'adminGroups',
  i18nKey: 'importDestAdminGroups',
  hasGroupStep: false,
  fields: [
    {
      key: 'firstName',
      i18nKey: 'importFieldFirstName',
      required: true,
      autoMatch: ['firstname', 'first name', 'prenom', 'prénom', 'vorname', 'nome', 'first', 'given name', 'given', 'nom prenom', 'name']
    },
    {
      key: 'lastName',
      i18nKey: 'importFieldLastName',
      required: false,
      autoMatch: ['lastname', 'last name', 'nom', 'nom de famille', 'nachname', 'cognome', 'last', 'surname', 'family name', 'family']
    },
    {
      key: 'customName',
      i18nKey: 'importFieldCustomName',
      required: false,
      autoMatch: ['customname', 'custom name', 'nickname', 'surnom', 'alias', 'pseudo', 'spitzname', 'soprannome', 'custom']
    },
    {
      key: 'dob',
      i18nKey: 'importFieldDob',
      required: false,
      type: 'date',
      autoMatch: ['dob', 'date of birth', 'birthday', 'birthdate', 'date naissance', 'naissance', 'né le', 'née le', 'geburtsdatum', 'data di nascita', 'nascita']
    },
    {
      key: 'adminClass',
      i18nKey: 'importFieldAdminClass',
      required: false,
      autoMatch: ['class', 'admin class', 'classe admin', 'adminclass', 'classe', 'division', 'klasse', 'admin', 'administrative class']
    },
    {
      key: 'gender',
      i18nKey: 'importFieldGender',
      required: false,
      autoMatch: ['gender', 'sexe', 'sex', 'genre', 'geschlecht', 'sesso']
    },
    {
      key: 'studentNumber',
      i18nKey: 'importFieldStudentNumber',
      required: false,
      autoMatch: ['student number', 'student id', 'ine', 'matricule', 'id', 'numéro étudiant', 'schülernummer', 'numero studente']
    },
    {
      key: 'sen',
      i18nKey: 'importFieldSen',
      required: false,
      type: 'boolean',
      autoMatch: ['sen', 'special needs', 'besoins particuliers', 'pap', 'ppre', 'pai', 'pps', 'gevasco', 'dys', 'tdah', 'adhd', 'handicap']
    },
    {
      key: 'regime',
      i18nKey: 'importFieldRegime',
      required: false,
      autoMatch: ['regime', 'régime', 'status', 'dp', 'ext', 'demi pensionnaire', 'externe', 'interne']
    },
    {
      key: 'guardian1Name',
      i18nKey: 'importFieldGuardian1Name',
      required: false,
      autoMatch: ['guardian', 'parent 1', 'responsable 1', 'legal guardian', 'contact parent', 'father', 'mother', 'parent']
    },
    {
      key: 'guardian1Phone',
      i18nKey: 'importFieldGuardian1Phone',
      required: false,
      autoMatch: ['phone', 'tel', 'téléphone', 'telephone', 'mobile', 'portable', 'parent phone', 'tel resp 1', 'telefon']
    },
    {
      key: 'guardian1Email',
      i18nKey: 'importFieldGuardian1Email',
      required: false,
      autoMatch: ['email', 'e-mail', 'courriel', 'mail', 'parent email', 'mail resp 1']
    },
    {
      key: 'address',
      i18nKey: 'importFieldAddress',
      required: false,
      autoMatch: ['address', 'adresse', 'street', 'rue', 'domicile', 'adresse postale']
    },
    {
      key: 'medicalNotes',
      i18nKey: 'importFieldMedicalNotes',
      required: false,
      autoMatch: ['medical', 'allergies', 'santé', 'medical notes', 'pai médical', 'remarques médicales']
    }
  ],
  conflictKey: function (row) {
    return ((row.firstName || '').trim().toUpperCase() + '|' + (row.lastName || '').trim().toUpperCase());
  }
};
