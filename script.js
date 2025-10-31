document.addEventListener("DOMContentLoaded", () => {
  const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt')
  //const client = mqtt.connect("wss://ec2-54-233-175-183.sa-east-1.compute.amazonaws.com:8084/mqtt")
  //const client = mqtt.connect("wss://localhost:8084/mqtt")
  const data = []

  // Tópicos MQTT para cada sensor
  const TempTopic = "mqtt/ufpb-inst/temp"
  const turbidezTopic = "mqtt/ufpb-inst/turbidez"
  const solidosTopic = "mqtt/ufpb-inst/solidos_dissolvidos"
  const condutividadeTopic = "mqtt/ufpb-inst/condutividade"
  const phTopic = "mqtt/ufpb-inst/ph"
  const UmidadeTopic = "mqtt/ufpb-inst/umidade"

  // Inscrever nos tópicos
  client.subscribe(TempTopic)
  client.subscribe(turbidezTopic)
  client.subscribe(solidosTopic)
  client.subscribe(condutividadeTopic)
  client.subscribe(phTopic)
  client.subscribe(UmidadeTopic)

  // Processar mensagens recebidas
  client.on("message", (topic, payload) => {
    try {
      console.log(`Message on topic ${topic}: ${payload.toString()}`)
      const number = Number.parseFloat(payload.toString())
      if (!isNaN(number)) {
        updateChart(topic, number)
        updateSensorCard(topic, number)
      }
    } catch (e) {
      console.log(e.message)
    }
  })

  // Evento de conexão
  client.on("connect", () => {
    setTimeout(infoHide, 1000)
    if (typeof toastr !== "undefined") {
      toastr.success("Conectado ao broker MQTT!")
    }
  })

  // Configuração dos gráficos Chart.js
  const createChartConfig = (label, yAxisText) => ({
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: label,
          backgroundColor: "#4ECCA3",
          borderColor: "#4ECCA3",
          data: [],
          fill: false,
          tension: 0.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: yAxisText,
            color: "#EEEEEE",
          },
          ticks: {
            color: "#EEEEEE",
          },
          grid: {
            color: "#2a2a3e",
          },
        },
        x: {
          title: {
            display: true,
            text: "Tempo",
            color: "#EEEEEE",
          },
          ticks: {
            color: "#EEEEEE",
          },
          grid: {
            color: "#2a2a3e",
          },
        },
      },
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      color: "#EEEEEE",
    },
  })

  // Criar configurações para cada gráfico 
  //configurações da linha vertical
  const configTemp = createChartConfig("Temperatura", "Temperatura (°C)")
  const configTurbidez = createChartConfig("Turbidez", "Turbidez (NTU)")
  const configSolidos = createChartConfig("Sólidos Dissolvidos", "Sólidos (ppm)")
  const configCondutividade = createChartConfig("Condutividade", "Condutividade (μS/cm)")
  const configPH = createChartConfig("pH", "pH")
  const configUmidade = createChartConfig("Umidade", "Umidade (%)")

  // Inicializar gráficos
  const ctxTemp = document.getElementById("canvas").getContext("2d")
  window.myLineTemp = new Chart(ctxTemp, configTemp)

  const ctxUmidade = document.getElementById("canvasUmidade").getContext("2d")
  window.myLineUmidade = new Chart(ctxUmidade, configUmidade)

  const ctxTurbidez = document.getElementById("canvasTurbidez").getContext("2d")
  window.myLineTurbidez = new Chart(ctxTurbidez, configTurbidez)

  const ctxSolidos = document.getElementById("canvasSolidos").getContext("2d")
  window.myLineSolidos = new Chart(ctxSolidos, configSolidos)

  const ctxCondutividade = document.getElementById("canvasCondutividade").getContext("2d")
  window.myLineCondutividade = new Chart(ctxCondutividade, configCondutividade)

  const ctxPH = document.getElementById("canvasPH").getContext("2d")
  window.myLinePH = new Chart(ctxPH, configPH)

  const logs = document.getElementById("logs")
  const limit = 10

  // Atualizar gráfico com novos dados
  const updateChart = (topic, number) => {
    let chart
    let unit = ""
    let sensorName = ""

    switch (topic) {
      case TempTopic:
        chart = window.myLineTemp
        unit = "ºC"
        sensorName = "Temperatura"
        break
      case UmidadeTopic:
        chart = window.myLineUmidade
        unit = "%"
        sensorName = "Umidade"
        break
      case turbidezTopic:
        chart = window.myLineTurbidez
        unit = "NTU"
        sensorName = "Turbidez"
        break
      case solidosTopic:
        chart = window.myLineSolidos
        unit = "ppm"
        sensorName = "Sólidos Dissolvidos"
        break
      case condutividadeTopic:
        chart = window.myLineCondutividade
        unit = "μS/cm"
        sensorName = "Condutividade"
        break
      case phTopic:
        chart = window.myLinePH
        unit = ""
        sensorName = "pH"
        break
      default:
        return
    }

    if (chart.config.data.datasets.length > 0) {
      const date = new Date()
      const hours = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
      const copyData = chart.config.data.labels.slice((limit - 1) * -1)

      copyData.push(hours)
      chart.config.data.labels = copyData

      chart.config.data.datasets.forEach((dataset) => {
        const copyData = dataset.data.slice((limit - 1) * -1)
        copyData.push(number)

        data.unshift({ hours, number, topic, sensorName, unit })

        // Atualizar logs
        logs.innerHTML = ""
        data.slice(0, 20).forEach((item) => {
          logs.innerHTML += `<div class="log">
            <div class="logHora">${item.hours}</div>
            <div class="separador"></div>
            <div class="logDado">${item.sensorName}: ${item.number}${item.unit}</div>
          </div>`
        })

        dataset.data = copyData
      })

      chart.update()
    }
  }

  // Atualizar cards dos sensores
  const updateSensorCard = (topic, value) => {
    let sensorId = ""

    switch (topic) {
      case TempTopic:
        sensorId = "temp"
        break
      case UmidadeTopic:
        sensorId = "Umidade"
        break
      case turbidezTopic:
        sensorId = "turbidity"
        break
      case solidosTopic:
        sensorId = "tds"
        break
      case condutividadeTopic:
        sensorId = "conductivity"
        break
      case phTopic:
        sensorId = "ph"
        break
      default:
        return
    }

    const valueElement = document.getElementById(`${sensorId}-value`)
    if (valueElement) {
      valueElement.textContent = value.toFixed(2)
    }
  }

  // Funções de status
  function infoShow() {
    const info = document.getElementById("statusInfo")
    info.innerHTML = `
      <div class="loading">
        <div class="lds-facebook">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <div class="status">Conectando...</div>
    `
  }

  function infoHide() {
    const info = document.getElementById("statusInfo")
    info.innerHTML = '<div class="status"><i class="fa fa-check"></i> Conectado</div>'
    info.style.color = "var(--accent-green)"
  }

  // Botão de salvar CSV
  const saveButton = document.getElementById("save")
  saveButton.addEventListener("click", () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Hora;Sensor;Valor;Unidade\n" +
      data.map((e) => `${e.hours};${e.sensorName};${e.number};${e.unit}`).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "dados_sensores.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    if (typeof toastr !== "undefined") {
      toastr.info("Arquivo CSV gerado com sucesso!")
    }
  })

  // Mostrar status de conexão
  infoShow()
})
