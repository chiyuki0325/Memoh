
import {type robot } from '@memoh/shared'
export default function (chatItem: robot, desc: string) {
  const robotAnswer=new ReadableStream({
    async start(controller){     
      for (const str of [...desc]) {
        await new Promise(resolve=>setTimeout(()=>resolve(str),50))
        controller.enqueue(str)
      }
      controller.close()
    }
  })

  async function readRobotAnswer() {
    const reader = robotAnswer.getReader()
    let answer = await reader.read()
    chatItem.state = 'generate'
    while (!answer.done) {     
      chatItem.description = `${chatItem.description}${answer.value}`
      answer=await reader.read()
    }
    chatItem.state = 'complete'    
  }

  if (chatItem.state !== 'complete') {
    readRobotAnswer()  
  }
}