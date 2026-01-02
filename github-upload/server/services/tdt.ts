import axios from 'axios';

export interface TDTChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  tvgName?: string;
  tvgId?: string;
}

export interface TDTChannelsByCategory {
  [category: string]: TDTChannel[];
}

export class TDTService {
  private readonly TDT_M3U8_URL = 'https://www.tdtchannels.com/lists/tv.m3u8';
  private readonly BACKUP_M3U8_URL = 'https://raw.githubusercontent.com/LaQuay/TDTChannels/master/lists/tv.m3u8';
  
  // Mapeo de categorías TDT a español
  private readonly CATEGORY_MAPPING: Record<string, string> = {
    'Generalistas': '🇪🇸 Generalistas',
    'Informativos': '📰 Noticias e Informativos',
    'Deportivos': '⚽ Deportes TDT',
    'Infantiles': '👶 Infantiles',
    'Eventuales': '📺 Canales Eventuales',
    'Autonómicos': '🏛️ Autonómicos',
    'Musicales': '🎵 Música',
    'Locales': '📍 Locales',
    'Temáticos': '🎬 Temáticos',
    'Internacionales': '🌍 Internacionales'
  };

  // Canales TDT españoles prioritarios (solo disponibles en TDTChannels)
  private readonly PRIORITY_SPANISH_CHANNELS = [
    'la 1', 'la 2', '24h', 'teledeporte', 'clan', 'trece',
    'el toro tv', 'somos cine', 'real madrid tv', 'esport 3',
    'ib3', 'telemadrid', 'canal sur', 'tv3', 'etb',
    'galicia tv', 'aragón tv', 'castilla la mancha tv', 'extremadura tv'
  ];

  async getTDTChannels(): Promise<TDTChannel[]> {
    try {
      console.log('🔄 Fetching TDT channels from TDTChannels...');
      
      const response = await axios.get('https://www.tdtchannels.com/lists/tv.m3u8', {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/vnd.apple.mpegurl, text/plain, */*',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        },
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const channels = this.parseM3U8(response.data);
      console.log(`✅ Successfully parsed ${channels.length} TDT channels`);
      
      if (channels.length === 0) {
        console.warn('⚠️ No channels parsed, trying backup...');
        return this.tryBackupSource();
      }
      
      return channels;
    } catch (error) {
      console.error('❌ Primary TDT source failed:', error instanceof Error ? error.message : String(error));
      return this.tryBackupSource();
    }
  }

  private async tryBackupSource(): Promise<TDTChannel[]> {
    try {
      console.log('🔄 Trying backup source...');
      
      const response = await axios.get('https://raw.githubusercontent.com/LaQuay/TDTChannels/master/lists/tv.m3u8', {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/vnd.apple.mpegurl, text/plain, */*'
        }
      });

      const channels = this.parseM3U8(response.data);
      console.log(`✅ Backup source returned ${channels.length} channels`);
      
      return channels.length > 0 ? channels : this.getStaticTDTChannels();
    } catch (error) {
      console.error('❌ Backup source failed:', error instanceof Error ? error.message : String(error));
      console.log('📺 Using static channel list...');
      return this.getStaticTDTChannels();
    }
  }

  async getTDTChannelsByCategories(): Promise<TDTChannelsByCategory> {
    const allChannels = await this.getTDTChannels();
    
    // Separar canales prioritarios primero
    const priorityChannels = this.findPriorityChannels(allChannels);
    const otherChannels = allChannels.filter(ch => 
      !priorityChannels.some(pc => pc.id === ch.id)
    );
    
    const categorizedChannels: TDTChannelsByCategory = {};

    // Agregar categoría especial para canales principales de España (PRIMERA)
    if (priorityChannels.length > 0) {
      categorizedChannels['📺 Canales Principales España'] = priorityChannels;
    }

    // Procesar el resto de canales por categorías
    otherChannels.forEach(channel => {
      const categoryKey = this.CATEGORY_MAPPING[channel.group] || channel.group;
      
      if (!categorizedChannels[categoryKey]) {
        categorizedChannels[categoryKey] = [];
      }
      
      categorizedChannels[categoryKey].push(channel);
    });

    // Ordenar canales dentro de cada categoría (excepto los principales que ya están ordenados)
    Object.keys(categorizedChannels).forEach(category => {
      if (category === '📺 Canales Principales España') {
        return; // Ya están ordenados por prioridad
      }
      
      categorizedChannels[category].sort((a, b) => {
        const aIsSpanish = this.isSpanishChannel(a.name);
        const bIsSpanish = this.isSpanishChannel(b.name);
        
        if (aIsSpanish && !bIsSpanish) return -1;
        if (!aIsSpanish && bIsSpanish) return 1;
        return a.name.localeCompare(b.name);
      });
    });

    // Ordenar categorías con los principales de España primero
    const sortedCategories: TDTChannelsByCategory = {};
    
    // Primero los canales principales
    if (categorizedChannels['📺 Canales Principales España']) {
      sortedCategories['📺 Canales Principales España'] = categorizedChannels['📺 Canales Principales España'];
    }
    
    // Luego otras categorías españolas importantes
    const spanishCategories = ['🇪🇸 Generalistas', '📰 Noticias e Informativos', '⚽ Deportes TDT'];
    spanishCategories.forEach(cat => {
      if (categorizedChannels[cat]) {
        sortedCategories[cat] = categorizedChannels[cat];
      }
    });
    
    // Resto de categorías ordenadas alfabéticamente
    Object.keys(categorizedChannels)
      .filter(cat => !['📺 Canales Principales España', ...spanishCategories].includes(cat))
      .sort()
      .forEach(cat => {
        sortedCategories[cat] = categorizedChannels[cat];
      });

    return sortedCategories;
  }

  private findPriorityChannels(channels: TDTChannel[]): TDTChannel[] {
    const foundChannels: TDTChannel[] = [];
    
    console.log(`🔍 Searching for priority channels in ${channels.length} total channels...`);
    
    // Buscar cada canal prioritario en orden de importancia
    for (const priorityChannel of this.PRIORITY_SPANISH_CHANNELS) {
      const matches = channels.filter(ch => {
        const channelName = ch.name.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const priorityName = priorityChannel.toLowerCase().replace(/[^\w\s]/g, '').trim();
        
        // Búsquedas específicas para canales TDT españoles disponibles
        switch (priorityName) {
          case 'la 1':
            return channelName.includes('la 1') || channelName === 'la1';
          case 'la 2':
            return channelName.includes('la 2') || channelName === 'la2';
          case '24h':
            return channelName.includes('24h') || channelName.includes('24 h') || 
                   channelName.includes('24 horas');
          case 'teledeporte':
            return channelName.includes('teledeporte') || channelName.includes('tdp');
          case 'clan':
            return channelName.includes('clan') && !channelName.includes('clantvs');
          case 'trece':
            return channelName.includes('trece') || channelName === '13' ||
                   channelName.includes('13 tv');
          case 'el toro tv':
            return channelName.includes('el toro') || channelName.includes('toro tv');
          case 'somos cine':
            return channelName.includes('somos cine') || channelName.includes('rtve cine');
          case 'real madrid tv':
            return channelName.includes('real madrid') || channelName.includes('realmadrid');
          case 'esport 3':
            return channelName.includes('esport 3') || channelName.includes('esport3');
          case 'ib3':
            return channelName.includes('ib3') || channelName.includes('ib 3');
          case 'telemadrid':
            return channelName.includes('telemadrid') || channelName.includes('tele madrid');
          case 'canal sur':
            return channelName.includes('canal sur') || channelName.includes('canalsur');
          case 'tv3':
            return channelName.includes('tv3') || channelName.includes('tv 3') ||
                   channelName.includes('televisió');
          case 'etb':
            return channelName.includes('etb') || channelName.includes('euskal');
          case 'galicia tv':
            return channelName.includes('galicia') || channelName.includes('tvg');
          case 'aragón tv':
            return channelName.includes('aragón') || channelName.includes('aragon');
          case 'castilla la mancha tv':
            return channelName.includes('castilla') && channelName.includes('mancha');
          case 'extremadura tv':
            return channelName.includes('extremadura');
          default:
            return channelName.includes(priorityName) || 
                   channelName.replace(/\s+/g, '').includes(priorityName.replace(/\s+/g, ''));
        }
      });
      
      // Agregar el primer match encontrado para evitar duplicados
      if (matches.length > 0) {
        const bestMatch = matches[0];
        if (!foundChannels.some(fc => fc.id === bestMatch.id)) {
          foundChannels.push(bestMatch);
          console.log(`✅ Found ${priorityChannel}: ${bestMatch.name}`);
        }
      } else {
        console.log(`❌ Not found: ${priorityChannel}`);
      }
    }
    
    console.log(`🎯 Total priority Spanish channels found: ${foundChannels.length}`);
    console.log(`📺 Channels: ${foundChannels.map(ch => ch.name).join(', ')}`);
    
    return foundChannels;
  }

  private parseM3U8(content: string): TDTChannel[] {
    const lines = content.split('\n');
    const channels: TDTChannel[] = [];
    let currentChannel: Partial<TDTChannel> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Parsear información del canal
        const nameMatch = line.match(/,(.+)$/);
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const groupMatch = line.match(/group-title="([^"]+)"/);
        const tvgIdMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]+)"/);

        if (nameMatch) {
          currentChannel = {
            name: nameMatch[1].trim(),
            logo: logoMatch ? logoMatch[1] : '',
            group: groupMatch ? groupMatch[1] : 'Otros',
            tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
            tvgName: tvgNameMatch ? tvgNameMatch[1] : ''
          };
        }
      } else if (line.startsWith('http') && currentChannel.name) {
        // Esta es la URL del stream
        const channel: TDTChannel = {
          id: this.generateChannelId(currentChannel.name, currentChannel.group || 'Otros'),
          name: currentChannel.name,
          logo: currentChannel.logo || '',
          group: currentChannel.group || 'Otros',
          url: line,
          tvgName: currentChannel.tvgName,
          tvgId: currentChannel.tvgId
        };

        channels.push(channel);
        currentChannel = {};
      }
    }

    // Eliminar duplicados basados en nombre y grupo
    const uniqueChannels = channels.filter((channel, index, array) => {
      return index === array.findIndex(c => 
        c.name === channel.name && c.group === channel.group
      );
    });

    console.log(`📊 Parsed ${uniqueChannels.length} unique TDT channels`);
    return uniqueChannels;
  }

  private generateChannelId(name: string, group: string): string {
    return `tdt-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${group.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  private isSpanishChannel(channelName: string): boolean {
    const normalizedName = channelName.toLowerCase();
    return this.PRIORITY_SPANISH_CHANNELS.some(spanish => 
      normalizedName.includes(spanish)
    );
  }

  private getStaticTDTChannels(): TDTChannel[] {
    return [
      {
        id: 'tdt-la-1-generalistas',
        name: 'La 1',
        logo: 'https://pbs.twimg.com/profile_images/1921959108862709760/fe5Tqhlh_200x200.jpg',
        group: 'Generalistas',
        url: 'https://ztnr.rtve.es/ztnr/1688877.m3u8',
        tvgId: 'La1.TV',
        tvgName: 'La 1'
      },
      {
        id: 'tdt-la-2-generalistas',
        name: 'La 2',
        logo: 'https://yt3.googleusercontent.com/ytc/AIdro_kqgHWySi5xprs1VFCNCX0IKNT8yXBLZC43JMoB8j0JUto=s200',
        group: 'Generalistas',
        url: 'https://ztnr.rtve.es/ztnr/1688885.m3u8',
        tvgId: 'La2.TV',
        tvgName: 'La 2'
      },
      {
        id: 'tdt-trece-generalistas',
        name: 'TRECE',
        logo: 'https://graph.facebook.com/TRECEtves/picture?width=200&height=200',
        group: 'Generalistas',
        url: 'https://live-edge-ff-1.cdn.enetres.net/091DB7AFBD77442B9BA2F141DCC182F5021/liveld/index.m3u8',
        tvgId: '13.TV',
        tvgName: 'TRECE'
      },
      {
        id: 'tdt-eltoro-generalistas',
        name: 'El Toro TV',
        logo: 'https://graph.facebook.com/eltorotv.es/picture?width=200&height=200',
        group: 'Generalistas',
        url: 'https://streaming-1.eltorotv.com/lb0/eltorotv-streaming-web/index.m3u8',
        tvgId: 'ElToroTV.TV',
        tvgName: 'El Toro TV'
      },
      {
        id: 'tdt-24h-informativos',
        name: '24h',
        logo: 'https://pbs.twimg.com/profile_images/1634293543987453954/mb1Rzmso_200x200.jpg',
        group: 'Informativos',
        url: 'https://ztnr.rtve.es/ztnr/1694255.m3u8',
        tvgId: '24Horas.TV',
        tvgName: '24h'
      },
      {
        id: 'tdt-euronews-informativos',
        name: 'Euronews',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Euronews_2016_logo.svg/200px-Euronews_2016_logo.svg.png',
        group: 'Informativos',
        url: 'https://d1mpprlbe8tn2j.cloudfront.net/v1/master/7b67fbda7ab859400a821e9aa0deda20ab7ca3d2/euronews_prod/euronews.m3u8',
        tvgId: 'Euronews.TV',
        tvgName: 'Euronews'
      },
      {
        id: 'tdt-teledeporte-deportivos',
        name: 'Teledeporte',
        logo: 'https://graph.facebook.com/teledeporteRTVE/picture?width=200&height=200',
        group: 'Deportivos',
        url: 'https://ztnr.rtve.es/ztnr/1712295.m3u8',
        tvgId: 'TDP.TV',
        tvgName: 'Teledeporte'
      },
      {
        id: 'tdt-realmadrid-deportivos',
        name: 'Real Madrid TV',
        logo: 'https://graph.facebook.com/RealMadrid/picture?width=200&height=200',
        group: 'Deportivos',
        url: 'https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01201-cinedigmentertainment-realmadrid-cineverse/playlist.m3u8',
        tvgId: 'RealMadridTV.TV',
        tvgName: 'Real Madrid TV'
      },
      {
        id: 'tdt-clan-infantiles',
        name: 'Clan',
        logo: 'https://graph.facebook.com/clantve/picture?width=200&height=200',
        group: 'Infantiles',
        url: 'https://ztnr.rtve.es/ztnr/5466990.m3u8',
        tvgId: 'Clan.TV',
        tvgName: 'Clan'
      },
      {
        id: 'tdt-boing-infantiles',
        name: 'Boing',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Boing_logo.svg/200px-Boing_logo.svg.png',
        group: 'Infantiles',
        url: 'https://spa-ha-p004.cdn.masmediatv.es/SVoriginOperatorEdge/smil:5_HD.smil/manifest.m3u8',
        tvgId: 'Boing.TV',
        tvgName: 'Boing'
      }
    ];
  }

  async searchTDTChannels(query: string): Promise<TDTChannel[]> {
    const channels = await this.getTDTChannels();
    const searchTerm = query.toLowerCase();

    return channels.filter(channel => 
      channel.name.toLowerCase().includes(searchTerm) ||
      channel.group.toLowerCase().includes(searchTerm) ||
      (channel.tvgName && channel.tvgName.toLowerCase().includes(searchTerm))
    );
  }

  async getTDTChannelStream(channelId: string): Promise<string | null> {
    const channels = await this.getTDTChannels();
    const channel = channels.find(c => c.id === channelId);
    
    if (!channel) {
      console.error(`❌ TDT Channel not found: ${channelId}`);
      return null;
    }

    console.log(`🎥 Getting TDT stream for: ${channel.name}`);
    return channel.url;
  }

  // Obtener información EPG (si está disponible)
  async getTDTChannelProgram(channelId: string): Promise<any> {
    // Por ahora retornamos información básica
    // En el futuro se puede integrar con la EPG de TDTChannels
    const channels = await this.getTDTChannels();
    const channel = channels.find(c => c.id === channelId);
    
    if (!channel) return null;

    return {
      channelId,
      channelName: channel.name,
      currentProgram: 'Programación en directo',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString() // +1 hora
    };
  }
}