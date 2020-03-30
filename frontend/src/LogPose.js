import React, { useState, useEffect, useRef } from 'react';
import { useParams } from "react-router-dom";
import * as posenet from "@tensorflow-models/posenet"

function LogPose() {

    const { imageName } = useParams();
    const IMAGE_NAMES = ['dance.png', 'eagle.png', 'garland.png', 'gate.png', 'half-moon.png', 'parivrtta-trikonasana.png', 'vrksasana.png', 
    'warrior-I.png', 'warrior-II.png', 'bigtoepose.jpg', 'chairpose.jpg'];
    const imageRef = useRef();
    const [currentImage, setCurrentImage] = useState(0);
    const [net, setNet] = useState(null);

    useEffect(() => {
        async function loadNet() {
          const poseNet = await posenet.load({
            architecture: 'ResNet50',
            quantBytes: 4,
            outputStride: 32,
            inputResolution: 193,
          });
          setNet(poseNet)
        }
        loadNet()
    }, [imageName])

    const sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    useEffect(() => {

        if (!net || !imageRef.current) {
            return;
        }

        imageRef.current.src = `${process.env.PUBLIC_URL}/img/${IMAGE_NAMES[currentImage]}`;

        async function getPose() {
            await sleep(1000);
            const pose = await net.estimateSinglePose(imageRef.current);
            console.log(IMAGE_NAMES[currentImage]);
            console.log(pose);
        }
        getPose();

        setCurrentImage(currentImage + 1)

    }, [net, currentImage, imageRef])

    return (
        <>
            <h1>Logged pose for {imageName}</h1>
            <img className="reference-img" 
            ref={imageRef}
            src={`${process.env.PUBLIC_URL}/img/${imageName}`}/>
        </>

    )
}


export default LogPose;