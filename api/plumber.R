library(plumber)
library(jsonlite)

# Lazy-load rpact so /health responds immediately at startup
.rpact_loaded <- FALSE
.ensure_rpact <- function() {
  if (!.rpact_loaded) {
    library(rpact)
    .rpact_loaded <<- TRUE
  }
}

`%||%` <- function(x, y) if (!is.null(x) && length(x) > 0 && !identical(x, "")) x else y

.toNum <- function(x) {
  if (is.null(x) || (length(x) == 1 && is.na(x))) return(NA_real_)
  as.numeric(x)
}
.toInt <- function(x, default = NA_integer_) {
  if (is.null(x)) return(default)
  as.integer(x)
}
.toBool <- function(x, default = FALSE) {
  if (is.null(x)) return(default)
  isTRUE(as.logical(x))
}
.cleanNum <- function(x) {
  if (is.null(x)) return(NULL)
  x <- as.numeric(x)
  x[is.infinite(x) | is.nan(x)] <- NA_real_
  x
}
.getRCode <- function(obj, prefix = "") {
  tryCatch(
    getObjectRCode(obj, leadingArguments = prefix),
    error = function(e) paste0("# Could not extract R code: ", conditionMessage(e))
  )
}

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 204
    return(list())
  }
  plumber::forward()
}

.buildDesign <- function(body) {
  .ensure_rpact()
  kMax         <- .toInt(body$kMax, 3L)
  alpha        <- .toNum(body$alpha) %||% 0.025
  beta         <- .toNum(body$beta)  %||% 0.2
  typeOfDesign <- as.character(body$typeOfDesign %||% "OF")
  sided        <- .toInt(body$sided, 1L)

  if (!is.na(alpha) && (alpha <= 0 || alpha >= 1)) stop("'alpha' must be between 0 and 1 (exclusive).")
  if (!is.na(beta)  && (beta  <= 0 || beta  >= 1)) stop("'beta' must be between 0 and 1 (exclusive).")
  if (!kMax %in% 1:10)                              stop("'kMax' must be an integer between 1 and 10.")
  if (!sided %in% c(1L, 2L))                        stop("'sided' must be 1 or 2.")

  getDesignGroupSequential(kMax = kMax, alpha = alpha, beta = beta,
                           typeOfDesign = typeOfDesign, sided = sided)
}

# ── /design ──────────────────────────────────────────────────────────────────
#* @post /design
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    list(success = TRUE,
         result  = list(kMax = d$kMax, alpha = d$alpha, beta = d$beta,
                        sided = d$sided, typeOfDesign = d$typeOfDesign,
                        informationRates = .cleanNum(d$informationRates),
                        criticalValues   = .cleanNum(d$criticalValues),
                        futilityBounds   = .cleanNum(d$futilityBounds),
                        stageLevels      = .cleanNum(d$stageLevels),
                        alphaSpent       = .cleanNum(d$alphaSpent)),
         rCode = .getRCode(d, "design <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /sample-size/means ───────────────────────────────────────────────────────
#* @post /sample-size/means
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d           <- .buildDesign(body)
    alternative <- .toNum(body$alternative)
    if (is.null(alternative) || all(is.na(alternative))) alternative <- seq(0.2, 1, 0.2)
    stDev       <- .toNum(body$stDev) %||% 1
    arp         <- .toNum(body$allocationRatioPlanned) %||% NA_real_
    r <- getSampleSizeMeans(design = d, alternative = alternative, stDev = stDev,
                            allocationRatioPlanned = arp, meanRatio = .toBool(body$meanRatio))
    list(success = TRUE,
         result  = list(numberOfSubjects    = .cleanNum(r$numberOfSubjects),
                        maxNumberOfSubjects = .cleanNum(r$maxNumberOfSubjects),
                        numberOfSubjects1   = .cleanNum(r$numberOfSubjects1),
                        numberOfSubjects2   = .cleanNum(r$numberOfSubjects2),
                        expectedNumberOfSubjectsH1 = .cleanNum(r$expectedNumberOfSubjectsH1),
                        alternative = .cleanNum(r$alternative),
                        informationRates = .cleanNum(d$informationRates),
                        criticalValues   = .cleanNum(d$criticalValues)),
         rCode = .getRCode(r, "sampleSizeMeans <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /sample-size/rates ───────────────────────────────────────────────────────
#* @post /sample-size/rates
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d   <- .buildDesign(body)
    pi1 <- .toNum(body$pi1); if (is.null(pi1) || all(is.na(pi1))) pi1 <- seq(0.4, 0.6, 0.1)
    pi2 <- .toNum(body$pi2) %||% 0.2
    arp <- .toNum(body$allocationRatioPlanned) %||% NA_real_
    r   <- getSampleSizeRates(design = d, pi1 = pi1, pi2 = pi2, allocationRatioPlanned = arp)
    list(success = TRUE,
         result  = list(numberOfSubjects    = .cleanNum(r$numberOfSubjects),
                        maxNumberOfSubjects = .cleanNum(r$maxNumberOfSubjects),
                        numberOfSubjects1   = .cleanNum(r$numberOfSubjects1),
                        numberOfSubjects2   = .cleanNum(r$numberOfSubjects2),
                        expectedNumberOfSubjectsH1 = .cleanNum(r$expectedNumberOfSubjectsH1),
                        pi1 = .cleanNum(r$pi1), pi2 = .cleanNum(r$pi2),
                        informationRates = .cleanNum(d$informationRates),
                        criticalValues   = .cleanNum(d$criticalValues)),
         rCode = .getRCode(r, "sampleSizeRates <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /sample-size/survival ────────────────────────────────────────────────────
#* @post /sample-size/survival
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    lambda1 <- .toNum(body$lambda1); lambda2 <- .toNum(body$lambda2)
    median1 <- .toNum(body$median1); median2 <- .toNum(body$median2)
    if (!is.null(median1) && !all(is.na(median1)) && (is.null(lambda1) || all(is.na(lambda1)))) lambda1 <- log(2) / median1
    if (!is.null(median2) && !all(is.na(median2)) && (is.null(lambda2) || all(is.na(lambda2)))) lambda2 <- log(2) / median2
    accrualTime      <- .toNum(body$accrualTime); if (is.null(accrualTime) || all(is.na(accrualTime))) accrualTime <- c(0, 12)
    accrualIntensity <- .toNum(body$accrualIntensity) %||% 0.1
    followUpTime     <- .toNum(body$followUpTime) %||% NA_real_
    eventTime        <- .toNum(body$eventTime) %||% 12
    arp              <- .toNum(body$allocationRatioPlanned) %||% NA_real_
    r <- getSampleSizeSurvival(design = d,
                               lambda1 = if (!is.null(lambda1) && !all(is.na(lambda1))) lambda1 else NA_real_,
                               lambda2 = if (!is.null(lambda2) && !all(is.na(lambda2))) lambda2 else NA_real_,
                               accrualTime = accrualTime, accrualIntensity = accrualIntensity,
                               followUpTime = followUpTime, eventTime = eventTime,
                               allocationRatioPlanned = arp)
    list(success = TRUE,
         result  = list(numberOfSubjects         = .cleanNum(r$numberOfSubjects),
                        maxNumberOfSubjects       = .cleanNum(r$maxNumberOfSubjects),
                        cumulativeEventsPerStage  = .cleanNum(r$cumulativeEventsPerStage),
                        maxNumberOfEvents         = .cleanNum(r$maxNumberOfEvents),
                        followUpTime              = .cleanNum(r$followUpTime),
                        studyDuration             = .cleanNum(r$studyDuration),
                        lambda1                   = .cleanNum(r$lambda1),
                        lambda2                   = .cleanNum(r$lambda2),
                        hazardRatio               = .cleanNum(r$hazardRatio),
                        informationRates          = .cleanNum(d$informationRates),
                        criticalValues            = .cleanNum(d$criticalValues)),
         rCode = .getRCode(r, "sampleSizeSurvival <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /power/means ─────────────────────────────────────────────────────────────
#* @post /power/means
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    maxN <- .toNum(body$maxNumberOfSubjects)
    if (is.null(maxN) || all(is.na(maxN))) stop("'maxNumberOfSubjects' is required.")
    alternative <- .toNum(body$alternative); if (is.null(alternative) || all(is.na(alternative))) alternative <- seq(0, 1, 0.2)
    r <- getPowerMeans(design = d, maxNumberOfSubjects = maxN, alternative = alternative,
                       stDev = .toNum(body$stDev) %||% 1,
                       allocationRatioPlanned = .toNum(body$allocationRatioPlanned) %||% NA_real_,
                       meanRatio = .toBool(body$meanRatio))
    list(success = TRUE,
         result  = list(overallReject            = .cleanNum(r$overallReject),
                        expectedNumberOfSubjects = .cleanNum(r$expectedNumberOfSubjects),
                        rejectPerStage           = .cleanNum(r$rejectPerStage),
                        alternative              = .cleanNum(r$alternative)),
         rCode = .getRCode(r, "powerMeans <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /power/rates ─────────────────────────────────────────────────────────────
#* @post /power/rates
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    maxN <- .toNum(body$maxNumberOfSubjects)
    if (is.null(maxN) || all(is.na(maxN))) stop("'maxNumberOfSubjects' is required.")
    pi1 <- .toNum(body$pi1); if (is.null(pi1) || all(is.na(pi1))) pi1 <- seq(0.2, 0.5, 0.1)
    r <- getPowerRates(design = d, maxNumberOfSubjects = maxN, pi1 = pi1,
                       pi2 = .toNum(body$pi2) %||% 0.2,
                       allocationRatioPlanned = .toNum(body$allocationRatioPlanned) %||% NA_real_)
    list(success = TRUE,
         result  = list(overallReject            = .cleanNum(r$overallReject),
                        expectedNumberOfSubjects = .cleanNum(r$expectedNumberOfSubjects),
                        rejectPerStage           = .cleanNum(r$rejectPerStage),
                        pi1                      = .cleanNum(r$pi1),
                        pi2                      = .cleanNum(r$pi2)),
         rCode = .getRCode(r, "powerRates <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /power/survival ──────────────────────────────────────────────────────────
#* @post /power/survival
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    maxN <- .toNum(body$maxNumberOfSubjects); maxE <- .toNum(body$maxNumberOfEvents)
    if ((is.null(maxN) || all(is.na(maxN))) && (is.null(maxE) || all(is.na(maxE))))
      stop("Either 'maxNumberOfSubjects' or 'maxNumberOfEvents' is required.")
    lambda1 <- .toNum(body$lambda1); lambda2 <- .toNum(body$lambda2)
    median1 <- .toNum(body$median1); median2 <- .toNum(body$median2)
    if (!is.null(median1) && !all(is.na(median1)) && (is.null(lambda1) || all(is.na(lambda1)))) lambda1 <- log(2) / median1
    if (!is.null(median2) && !all(is.na(median2)) && (is.null(lambda2) || all(is.na(lambda2)))) lambda2 <- log(2) / median2
    accrualTime <- .toNum(body$accrualTime); if (is.null(accrualTime) || all(is.na(accrualTime))) accrualTime <- c(0, 12)
    r <- getPowerSurvival(design = d,
                          lambda1 = if (!is.null(lambda1) && !all(is.na(lambda1))) lambda1 else NA_real_,
                          lambda2 = if (!is.null(lambda2) && !all(is.na(lambda2))) lambda2 else NA_real_,
                          accrualTime = accrualTime, accrualIntensity = .toNum(body$accrualIntensity) %||% 0.1,
                          eventTime = .toNum(body$eventTime) %||% 12,
                          maxNumberOfSubjects = if (!is.null(maxN)) maxN else NA_real_,
                          maxNumberOfEvents   = if (!is.null(maxE)) maxE else NA_real_,
                          allocationRatioPlanned = .toNum(body$allocationRatioPlanned) %||% 1)
    list(success = TRUE,
         result  = list(overallReject          = .cleanNum(r$overallReject),
                        expectedNumberOfEvents = .cleanNum(r$expectedNumberOfEvents),
                        rejectPerStage         = .cleanNum(r$rejectPerStage),
                        hazardRatio            = .cleanNum(r$hazardRatio)),
         rCode = .getRCode(r, "powerSurvival <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /simulation/means ────────────────────────────────────────────────────────
#* @post /simulation/means
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d           <- .buildDesign(body)
    alternative <- .toNum(body$alternative); if (is.null(alternative) || all(is.na(alternative))) alternative <- seq(0, 1, 0.2)
    plannedSubjects <- .toNum(body$plannedSubjects)
    if (is.null(plannedSubjects) || all(is.na(plannedSubjects)))
      plannedSubjects <- ceiling(seq(100 / d$kMax, 100, length.out = d$kMax))
    seed <- .toNum(body$seed); if (is.null(seed) || all(is.na(seed))) seed <- NA_real_
    if (!is.na(seed)) set.seed(as.integer(seed))
    r <- getSimulationMeans(design = d, alternative = alternative, stDev = .toNum(body$stDev) %||% 1,
                            plannedSubjects = plannedSubjects,
                            allocationRatioPlanned = .toNum(body$allocationRatioPlanned) %||% NA_real_,
                            meanRatio = .toBool(body$meanRatio),
                            maxNumberOfIterations = .toInt(body$maxNumberOfIterations, 1000L),
                            seed = seed)
    list(success = TRUE,
         result  = list(overallReject            = .cleanNum(r$overallReject),
                        expectedNumberOfSubjects = .cleanNum(r$expectedNumberOfSubjectsH1),
                        rejectPerStage           = .cleanNum(r$rejectPerStage),
                        alternative              = .cleanNum(r$alternative),
                        iterations               = .toInt(body$maxNumberOfIterations, 1000L)),
         rCode = .getRCode(r, "simMeans <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /simulation/rates ────────────────────────────────────────────────────────
#* @post /simulation/rates
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d   <- .buildDesign(body)
    pi1 <- .toNum(body$pi1); if (is.null(pi1) || all(is.na(pi1))) pi1 <- seq(0.2, 0.5, 0.1)
    pi2 <- .toNum(body$pi2); if (is.null(pi2) || all(is.na(pi2))) pi2 <- NA_real_
    plannedSubjects <- .toNum(body$plannedSubjects)
    if (is.null(plannedSubjects) || all(is.na(plannedSubjects)))
      plannedSubjects <- ceiling(seq(100 / d$kMax, 100, length.out = d$kMax))
    seed <- .toNum(body$seed); if (is.null(seed) || all(is.na(seed))) seed <- NA_real_
    if (!is.na(seed)) set.seed(as.integer(seed))
    r <- getSimulationRates(design = d, pi1 = pi1, pi2 = pi2,
                            plannedSubjects = plannedSubjects,
                            allocationRatioPlanned = .toNum(body$allocationRatioPlanned) %||% NA_real_,
                            maxNumberOfIterations = .toInt(body$maxNumberOfIterations, 1000L),
                            seed = seed)
    list(success = TRUE,
         result  = list(overallReject            = .cleanNum(r$overallReject),
                        expectedNumberOfSubjects = .cleanNum(r$expectedNumberOfSubjectsH1),
                        rejectPerStage           = .cleanNum(r$rejectPerStage),
                        pi1 = .cleanNum(r$pi1), pi2 = .cleanNum(r$pi2),
                        iterations = .toInt(body$maxNumberOfIterations, 1000L)),
         rCode = .getRCode(r, "simRates <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /simulation/survival ─────────────────────────────────────────────────────
#* @post /simulation/survival
#* @serializer unboxedJSON
function(req, res) {
  body <- tryCatch(fromJSON(req$postBody, simplifyVector = TRUE), error = function(e) list())
  tryCatch({
    d <- .buildDesign(body)
    lambda1 <- .toNum(body$lambda1); lambda2 <- .toNum(body$lambda2)
    median1 <- .toNum(body$median1); median2 <- .toNum(body$median2)
    if (!is.null(median1) && !all(is.na(median1)) && (is.null(lambda1) || all(is.na(lambda1)))) lambda1 <- log(2) / median1
    if (!is.null(median2) && !all(is.na(median2)) && (is.null(lambda2) || all(is.na(lambda2)))) lambda2 <- log(2) / median2
    accrualTime <- .toNum(body$accrualTime); if (is.null(accrualTime) || all(is.na(accrualTime))) accrualTime <- c(0, 12)
    plannedEvents <- .toNum(body$plannedEvents)
    if (is.null(plannedEvents) || all(is.na(plannedEvents)))
      plannedEvents <- ceiling(seq(50 / d$kMax, 50, length.out = d$kMax))
    seed <- .toNum(body$seed); if (is.null(seed) || all(is.na(seed))) seed <- NA_real_
    if (!is.na(seed)) set.seed(as.integer(seed))
    r <- getSimulationSurvival(design = d,
                               lambda1 = if (!is.null(lambda1) && !all(is.na(lambda1))) lambda1 else NA_real_,
                               lambda2 = if (!is.null(lambda2) && !all(is.na(lambda2))) lambda2 else NA_real_,
                               accrualTime = accrualTime, accrualIntensity = .toNum(body$accrualIntensity) %||% 0.1,
                               plannedEvents = plannedEvents, eventTime = .toNum(body$eventTime) %||% 12,
                               maxNumberOfIterations = .toInt(body$maxNumberOfIterations, 1000L),
                               seed = seed)
    list(success = TRUE,
         result  = list(overallReject            = .cleanNum(r$overallReject),
                        expectedNumberOfSubjects = .cleanNum(r$expectedNumberOfSubjectsH1),
                        expectedNumberOfEvents   = .cleanNum(r$expectedNumberOfEvents),
                        rejectPerStage           = .cleanNum(r$rejectPerStage),
                        hazardRatio              = .cleanNum(r$hazardRatio),
                        iterations               = .toInt(body$maxNumberOfIterations, 1000L)),
         rCode = .getRCode(r, "simSurvival <- "))
  }, error = function(e) { res$status <- 400; list(success = FALSE, error = conditionMessage(e)) })
}

# ── /health ───────────────────────────────────────────────────────────────────
#* @get /health
#* @serializer unboxedJSON
function() {
  list(status = "ok", time = format(Sys.time(), tz = "UTC", usetz = TRUE))
}
