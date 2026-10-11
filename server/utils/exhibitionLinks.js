import Artifact from '../models/Artifact.js';
import Exhibition from '../models/Exhibition.js';

// An artifact belongs to at most one exhibition. The link is stored on both sides:
//   Exhibition.artifacts  -> ordered list (the guided tour)
//   Artifact.exhibitionId -> which exhibition the artifact is in
// These helpers keep both sides in agreement.

// Called after an artifact's exhibitionId changes (null = not in any exhibition).
export const moveArtifactToExhibition = async (artifactId, exhibitionId) => {
  // Take it out of every other exhibition's tour
  await Exhibition.updateMany(
    { _id: { $ne: exhibitionId }, artifacts: artifactId },
    { $pull: { artifacts: artifactId } }
  );
  // Add it to the end of the new tour ($addToSet does nothing if it is already there)
  if (exhibitionId) {
    await Exhibition.updateOne({ _id: exhibitionId }, { $addToSet: { artifacts: artifactId } });
  }
};

// Called after an exhibition's artifacts list has been saved.
export const linkArtifactsToExhibition = async (exhibitionId, artifactIds) => {
  // Artifacts no longer in this tour are now in no exhibition
  await Artifact.updateMany({ exhibitionId, _id: { $nin: artifactIds } }, { exhibitionId: null });
  // Artifacts in this tour leave any other exhibition they were in...
  await Exhibition.updateMany(
    { _id: { $ne: exhibitionId }, artifacts: { $in: artifactIds } },
    { $pull: { artifacts: { $in: artifactIds } } }
  );
  // ...and point at this one
  await Artifact.updateMany({ _id: { $in: artifactIds } }, { exhibitionId });
};
