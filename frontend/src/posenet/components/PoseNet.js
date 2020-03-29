import React, { useRef, useState, useEffect } from "react"
import PropTypes from "prop-types"
import Loading from "./Loading"
import useInputImage from "../hooks/useInputImage"
import useLoadPoseNet from "../hooks/useLoadPoseNet"
import { drawKeypoints, getConfidentPoses } from "../util"

export default function PoseNet({
  style,
  className,
  facingMode,
  frameRate,
  input,
  onEstimate,
  inferenceConfig,
  modelConfig,
  minPoseConfidence,
  minPartConfidence,
  width,
  height
}) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const net = useLoadPoseNet(modelConfig)
  const [errorMessage, setErrorMessage] = useState()
  const onEstimateRef = useRef()
  const inferenceConfigRef = useRef()
  onEstimateRef.current = onEstimate
  inferenceConfigRef.current = inferenceConfig
  const image = useInputImage({
    input,
    width,
    height,
    videoRef,
    facingMode,
    frameRate
  })

  useEffect(() => {
    if (!net || !image) return () => {}
    if ([net, image].some(elem => elem instanceof Error)) return () => {}

    const ctx = canvasRef.current.getContext("2d")
    const intervalID = setInterval(async () => {
      try {
        const poses = await net.estimatePoses(image, inferenceConfigRef.current)
        const confidentPoses = getConfidentPoses(
          poses,
          minPoseConfidence,
          minPartConfidence
        )
        ctx.drawImage(image, 0, 0, width, height)
        onEstimateRef.current(confidentPoses)
        confidentPoses.forEach(({ keypoints }) => drawKeypoints(ctx, keypoints))
      } catch (err) {
        clearInterval(intervalID)
        setErrorMessage(err.message)
      }
    }, Math.round(1000 / frameRate))

    return () => clearInterval(intervalID)
  }, [
    frameRate,
    height,
    image,
    minPartConfidence,
    minPoseConfidence,
    net,
    width
  ])

  return (
    <>
      <Loading name="model" target={net} />
      <Loading name="input" target={image} />
      <font color="red">{errorMessage}</font>
      <video
        playsInline
        ref={videoRef}
        style={{ width: "0", height: "0" }}
        width={width}
        height={height}
      />
      <canvas
        style={style}
        className={className}
        ref={canvasRef}
        width={width}
        height={height}
      />
    </>
  )
}

PoseNet.propTypes = {
  /** canvas style */
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object,
  /** canvas className */
  className: PropTypes.string,
  /** @see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/facingMode  */
  facingMode: PropTypes.string,
  /** First of all frameRate is parameter of [getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
   *  see [MediaTrackConstraints.frameRate](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/frameRate)
   *  <br/>
   *  second frameRate affects how often estimation occurs. react-posenet internally <br/>
   *  [setInterval](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval)(() => { estimatePose() } , (1000 / framerate))
   *  to estimate image continuously */
  frameRate: PropTypes.number,
  /**
   * the input image to feed through the network. <br/>
   * If input is not specified react-posenet try to [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)<br/>
   * @see [tfjs-posenet document](https://github.com/tensorflow/tfjs-models/tree/master/posenet#params-in-estimatesinglepose)
   */
  input: PropTypes.element,
  /**
   * gets called after estimation. [poses](https://github.com/tensorflow/tfjs-models/tree/master/posenet#keypoints) is a passed parameter
   */
  onEstimate: PropTypes.func,
  /**
   * If you want swtich between single / multi pose estimation.<br/>
   * use decodingMethod [please check this code](https://github.com/tensorflow/tfjs-models/blob/master/posenet/demos/camera.js#L392) <br/>
   * {decodingMethod: "single-person"} / {decodingMethod: "multi-person"}
   * @see [tfjs-posenet documentation](https:/github.com/tensorflow/tfjs-models/tree/master/posenet#params-in-estimatemultipleposes)
   */
  inferenceConfig: PropTypes.shape({
    decodingMethod: PropTypes.string,
    flipHorizontal: PropTypes.bool,
    maxDetections: PropTypes.number,
    scoreThreshold: PropTypes.number,
    nmsRadius: PropTypes.number
  }),
  /** @see [tfjs-posenet documentation](https://github.com/tensorflow/tfjs-models/tree/master/posenet#config-params-in-posenetload) */
  modelConfig: PropTypes.shape({
    architecture: PropTypes.string,
    outputStride: PropTypes.number,
    inputResolution: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    quantBytes: PropTypes.number
  }),
  /** minimum confidence constraint for pose */
  minPoseConfidence: PropTypes.number,
  /** minimum confidence constraint for each [part](https://github.com/tensorflow/tfjs-models/tree/master/posenet#keypoints) */
  minPartConfidence: PropTypes.number,
  /** canvas width */
  width: PropTypes.number,
  /** canvas height */
  height: PropTypes.number
}

PoseNet.defaultProps = {
  style: {},
  className: "",
  facingMode: "user",
  frameRate: 20,
  input: undefined,
  onEstimate: () => {},
  inferenceConfig: {},
  modelConfig: {},
  minPoseConfidence: 0.1,
  minPartConfidence: 0.5,
  width: 600,
  height: 500
}
