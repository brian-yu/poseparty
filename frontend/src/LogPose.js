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
                  onEstimate={(image,pose) => {
                    if (!(image instanceof HTMLMediaElement)) {
                      console.log(image, pose)
                      console.log("\"" + imageName + "\": " + JSON.stringify(pose) + ',')
                      setPoseLogged(true);
                    }
                    setCount(count+1);
                  }}
                /> : null}
        </>

    )
}


export default LogPose;