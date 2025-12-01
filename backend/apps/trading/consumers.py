"""WebSocket consumers for trading app."""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class TradingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time trading updates.
    Can be extended to relay Binance data or broadcast position updates.
    """
    
    async def connect(self):
        self.symbol = self.scope['url_route']['kwargs']['symbol'].upper()
        self.room_group_name = f'trading_{self.symbol}'
        
        # Join symbol group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'status': 'connected',
            'symbol': self.symbol
        }))
    
    async def disconnect(self, close_code):
        # Leave symbol group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'subscribe':
                # Handle subscription requests
                await self.send(text_data=json.dumps({
                    'type': 'subscribed',
                    'channel': data.get('channel')
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
    
    async def trading_update(self, event):
        """Send trading update to WebSocket."""
        await self.send(text_data=json.dumps(event['data']))
    
    async def order_update(self, event):
        """Send order update to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'order_update',
            'data': event['data']
        }))
    
    async def position_update(self, event):
        """Send position update to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'position_update',
            'data': event['data']
        }))
