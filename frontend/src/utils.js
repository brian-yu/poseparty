import similarity from 'compute-cosine-similarity';

// A function to draw ellipses over the detected keypoints
export const drawKeypoints = (pose, minConfidence, ctx) => {
  // For each pose detected, loop through all the keypoints
  for (let j = 0; j < pose.pose.keypoints.length; j++) {
    const keypoint = pose.pose.keypoints[j];
    // Only draw an ellipse is the pose probability is bigger than 0.2
    if (keypoint.score >= minConfidence) {
      ctx.fillStyle = 'cyan';
      ctx.beginPath();
      ctx.arc(keypoint.position.x, keypoint.position.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// A function to draw the skeletons
export const drawSkeleton = (pose, ctx) => {
  // For every skeleton, loop through all body connections
  for (let j = 0; j < pose.skeleton.length; j++) {
    const partA = pose.skeleton[j][0];
    const partB = pose.skeleton[j][1];
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(partA.position.x, partA.position.y);
    ctx.lineTo(partB.position.x, partB.position.y);
    ctx.stroke();
  }
}

export const poseSimilarity = (pose1, pose2) => {
  const poseVector1 = getPoseVector(pose1);
  const poseVector2 = getPoseVector(pose2);
  return cosineDistanceMatching(poseVector1, poseVector2);
}

function getPoseVector(pose) {
  const vector = [];
  for (const keypoint of pose.pose.keypoints) {
    vector.push(keypoint.position.x)
    vector.push(keypoint.position.y)
  }
  return vector;
}

// Cosine similarity as a distance function. The lower the number, the closer // the match
// poseVector1 and poseVector2 are a L2 normalized 34-float vectors (17 keypoints each  
// with an x and y. 17 * 2 = 32)
function cosineDistanceMatching(poseVector1, poseVector2) {
  let cosineSimilarity = similarity(poseVector1, poseVector2);
  let distance = 2 * (1 - cosineSimilarity);
  return Math.sqrt(distance);
}


// poseVector1 and poseVector2 are 52-float vectors composed of:
// Values 0-33: are x,y coordinates for 17 body parts in alphabetical order
// Values 34-51: are confidence values for each of the 17 body parts in alphabetical order
// Value 51: A sum of all the confidence values
// Again the lower the number, the closer the distance
function weightedDistanceMatching(poseVector1, poseVector2) {
  let vector1PoseXY = poseVector1.slice(0, 34);
  let vector1Confidences = poseVector1.slice(34, 51);
  let vector1ConfidenceSum = poseVector1.slice(51, 52);

  let vector2PoseXY = poseVector2.slice(0, 34);

  // First summation
  let summation1 = 1 / vector1ConfidenceSum;

  // Second summation
  let summation2 = 0;
  for (let i = 0; i < vector1PoseXY.length; i++) {
    let tempConf = Math.floor(i / 2);
    let tempSum = vector1Confidences[tempConf] * Math.abs(vector1PoseXY[i] - vector2PoseXY[i]);
    summation2 = summation2 + tempSum;
  }

  return summation1 * summation2;
}