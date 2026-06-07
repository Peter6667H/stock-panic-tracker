import { useRef, useEffect } from 'react'
import { drawGauge } from '../lib/utils.js'

export default function PanicGauge({ score }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && score != null) {
      drawGauge(canvasRef.current, score)
    }
  }, [score])

  return <canvas ref={canvasRef} width={340} height={190} />
}
