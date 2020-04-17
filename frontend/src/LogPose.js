import React, { useState, useEffect, useRef } from 'react';
import { useParams } from "react-router-dom";
import PoseNet from './posenet/components/PoseNet';


function LogPose() {

    const { imageName } = useParams();
    const imageRef = useRef();
    const [poseLogged, setPoseLogged] = useState(false);
    const [count, setCount] = useState(0);
    console.log(imageRef)

    return (
        <>
            <h1>Logged pose for {imageName}</h1>
            <img className="reference-img" 
            ref={imageRef}
            src={`${process.env.PUBLIC_URL}/img/${imageName}`}/>
            { imageRef.current !== null && !poseLogged? 
            <PoseNet
                  className="posenet"
                  input={imageRef.current}
                  frameRate={1}
                  modelConfig={{
                    architecture: 'ResNet50',
                    quantBytes: 4,
                    outputStride: 32,
                    inputResolution: 193,
                  }}
                  inferenceConfig={{
                    decodingMethod: 'single-person',
                    maxDetections: 1,
                  }}
                  onEstimate={(pose,image) => {
                    if (!(image instanceof HTMLMediaElement)) {
                    const roundedPose = JSON.stringify(pose, (key, val) => {
                      return val.toFixed ? Number(val.toFixed(1)) : val;
                    })
                      console.log(image, roundedPose)
                      console.log("\"" + imageName + "\": " + JSON.stringify(roundedPose) + ',')
                    setPoseLogged(true);
                    }
                    setCount(count+1);
                  }}
                /> : null}
        </>

    )
}


export default LogPose;