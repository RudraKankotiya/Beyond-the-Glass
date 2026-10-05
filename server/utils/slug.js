// Turns "Tutankhamun's Golden Mask" into "tutankhamuns-golden-mask"
export const slugify = (text = '') =>
  text
    .toString()
    .normalize('NFKD') // split accented letters: "é" -> "e" + accent mark
    .replace(/[̀-ͯ]/g, '') // drop the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove anything that is not a letter, digit, space or dash
    .trim()
    .replace(/[\s-]+/g, '-'); // spaces/repeated dashes -> single dash

// Mongoose pre('validate') hook shared by Artifact and Exhibition.
// Uses a regular function (not an arrow) so `this` is the document being saved.
export async function setUniqueSlug() {
  // Keep an existing slug when only the title changes, so shared links don't break.
  if (this.slug && !this.isModified('slug')) return;

  const base = slugify(this.slug || this.title) || 'untitled';
  const Model = this.constructor;
  let slug = base;
  let counter = 2;

  // "roman-coin" taken? try "roman-coin-2", "roman-coin-3", ...
  while (await Model.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  // The unique index on `slug` is the final safety net if two saves race each other.
  this.slug = slug;
}
