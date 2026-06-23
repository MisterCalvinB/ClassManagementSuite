window.IMPORT_MODULE_CLASS_GROUPS = {
  id: 'classGroups',
  i18nKey: 'importDestClassGroups',
  hasGroupStep: true,
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
      key: 'dob',
      i18nKey: 'importFieldDob',
      required: false,
      type: 'date',
      autoMatch: ['dob', 'date of birth', 'birthday', 'birthdate', 'date naissance', 'naissance', 'geburtsdatum', 'data di nascita', 'nascita']
    },
    {
      key: 'adminClass',
      i18nKey: 'importFieldAdminClass',
      required: false,
      autoMatch: ['class', 'admin class', 'classe admin', 'adminclass', 'classe', 'klasse', 'admin', 'administrative class']
    },
    {
      key: 'sen',
      i18nKey: 'importFieldSen',
      required: false,
      type: 'boolean',
      autoMatch: ['sen', 'special needs', 'special educational needs', 'besoins particuliers', 'besondere bedurfnisse', 'bisogni speciali']
    }
  ],
  conflictKey: function (row) {
    return ((row.firstName || '').trim().toUpperCase() + '|' + (row.lastName || '').trim().toUpperCase());
  }
};
