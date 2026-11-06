// RETTELSE (profil kunne ikke gemmes): Formularen er en kopi af hele profilen, inklusive opslag med
// billeder. Blev det hele sendt, kunne tre store billeder overskride serverens grænse på 15 MB, og
// så fejlede gemningen med "Indholdet er for stort". Derfor sendes kun de felter, serveren gemmer.
const profileFields = [
  'name',
  'headline',
  'location',
  'about',
  'avatar',
  'discoverable',
  'experiences',
  'education',
  'visibility',
];

function profilePayload(draft) {
  const payload = Object.fromEntries(profileFields.map(field => [field, draft[field]]));
  payload.skills = String(draft.skillsText || '')
    .split(',')
    .map(skill => skill.trim())
    .filter(Boolean);
  return payload;
}

module.exports = { profilePayload };
