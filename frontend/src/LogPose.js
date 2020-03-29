import React, { useState, useEffect, useRef } from 'react';
import { useParams } from "react-router-dom";
import PoseNet from './posenet/components/PoseNet';


function LogPose() {

    const { imageName } = useParams();
    const imageRef = useRef();

    return (
        <>
            <h1>Logged pose for {imageName}</h1>
            <img className="reference-img" 
            ref={imageRef}
            src={`${process.env.PUBLIC_URL}/img/${imageName}`}/>
            { imageRef.current !== null ? 
            <PoseNet
                  className="posenet"
                  input={imageRef.current}
                  frameRate={.00001}
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
                  onEstimate={(pose) => console.log(pose)}
                /> : null}
        </>

    )
}


export default LogPose;