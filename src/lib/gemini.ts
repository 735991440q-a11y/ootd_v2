import { GoogleGenAI, Type } from "@google/genai";

export async function identifyClothing(base64Image: string, apiKey: string, categories: string[]) {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  console.log("Calling identifyClothing...");
  const systemInstruction = `
    识别穿搭信息并输出JSON。
    可选类别（优先从中选择）：${categories.join('、')}。如果完全不属于这些，请自行判断一个简短类别名。
    字段：category, color, style, season, thickness, formality, tags(Array)。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          },
          { text: "识别并描述这件衣服。" }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          color: { type: Type.STRING },
          style: { type: Type.STRING },
          season: { type: Type.STRING },
          thickness: { type: Type.STRING },
          formality: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["category", "color", "style", "season", "thickness", "formality", "tags"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function getOutfitsForWeather(weather: string, minTemp: number, maxTemp: number, wardrobe: any[], apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  const systemInstruction = `
    你是穿搭助手。根据天气和给定的气温区间推荐2套。
    温度逻辑：
    30℃+：清凉；24-30：轻薄；18-23：长袖/薄外套；10-17：针织/外套/长裤；5-9：毛衣+厚外套；0-4：保暖内搭+厚外套；更低：防寒。
    请根据最高和最低温的平均值以及天气情况进行决策。
    输出格式包含纯文字描述和搭配意象图描述。
    注意：在推荐时，必须从衣橱内容中检索最匹配的单品，并将该单品的id填入对应的ID字段。如果没有找到合适的单品，该ID字段应留空。
    输出JSON格式：{ 
      weatherAnalysis: string, 
      recommendations: [{ 
        title: string, 
        top: string, 
        topId: string, // 衣橱中对应上装的id，如果没有合适的则留空
        bottom: string, 
        bottomId: string, // 衣橱中对应下装的id
        outerwear: string, 
        outerwearId: string, // 衣橱中对应外套的id
        shoes: string, 
        shoesId: string, // 衣橱中对应鞋子的id
        reason: string,
        visualPrompt: string // 对推荐穿搭的视觉意象描述，用于前端展示
      }] 
    }
  `;

  const wardrobeContext = JSON.stringify(wardrobe.map(item => ({ 
    id: item.id,
    category: item.category, 
    color: item.color, 
    style: item.style,
    thickness: item.thickness 
  })));

  const response = await ai.models.generateContent({
    model,
    contents: `天气：${weather}，气温区间：${minTemp}℃至${maxTemp}℃。衣橱内容：${wardrobeContext}。`,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function getSingleItemOutfits(item: any, wardrobe: any[], apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  const systemInstruction = `
    你是穿搭助手。用户上传了一件单品，请给出穿搭建议。
    输出两部分：
    A 衣橱内搭配：基于已有衣橱给2-3套。不虚构。缺什么说明。
    B 互联网参考：基于时尚趋势给2-3套规律。
    
    输出JSON格式：{ 
      analysis: { category: string, color: string, style: string, season: string, scene: string },
      internalOutfits: [{ 
        title: string, 
        top: string, topId: string,
        bottom: string, bottomId: string,
        outerwear: string, outerwearId: string,
        accessories: string, accessoriesId: string,
        reason: string 
      }],
      internetReferences: [{ title: string, coreStrategy: string, suggestedItems: string[], scene: string }],
      missingItems: string[]
    }
  `;

  const wardrobeContext = JSON.stringify(wardrobe.map(item => ({ 
    id: item.id,
    category: item.category, 
    color: item.color, 
    style: item.style 
  })));

  const response = await ai.models.generateContent({
    model,
    contents: `当前单品：${JSON.stringify(item)}。我的衣橱：${wardrobeContext}。`,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || "{}");
}
