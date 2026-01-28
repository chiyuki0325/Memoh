export interface robot{
  description: string
  time: Date,
  id: string | number,
  type: string,
  action: 'robot',
  state:'thinking'|'generate'|'complete'
}

export interface user{
  description: string, 
  time: Date, 
  id: number | string,
  action:'user'
}