#' Visualize Probabilities using a Lollipop Chart
#'
#' This function creates a lollipop chart to visualize probabilities.
#'
#' @param data A data frame containing the probabilities to visualize.
#' @param plotBackgroundColor The background color of the plot.
#' @param plotBackgroundOpacity The opacity of the plot background.
#' @param title The title of the plot.
#' @param leftArea The label for the left area of the plot.
#' @param rightArea The label for the right area of the plot.
#' @param mediumText The font size for medium text elements.
#' @param bigText The font size for big text elements.
#' @param width The width of the widget (optional).
#' @param height The height of the widget (optional).
#' @param elementId The element ID of the widget (optional).
#' @param logoPath Logo path. Defaults to \code{NULL}.
#' @param logoSize Logo size. Defaults to \code{FALSE}.
#' @param logoLocation Logo location. \code{c('bottom-right', 'top-left', 'top-right', 'bottom-left')}.
#' @param rightAreaText The tooltip text for the right area of the plot.
#' @param leftAreaText The tooltip text for the left area of the plot.
#'
#' @return A HTML widget object representing the lollipop chart.
#'
#' @details
#' The data frame should have three columns: `name`, `value`, and `color`.
#' The `name` column specifies the names of the data points, while the
#' `value` column specifies the corresponding probabilities. The `color`
#' column specifies the color of each lollipop.
#'
#' @examples
#' data <- data.frame(
#'   Name = c("Outcome 1", "Outcome 2", "Outcome 3"),
#'   Prior = c(0.5, 0.5, 0.5),
#'   Posterior = c(0.2, 0.6, 0.9)
#' )
#' lollipops(data,
#'   logoPath = 'https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg',
#'   logoLocation = 'bottom-left')
#'
#' @export
#'
lollipops <-
  function(data,
           plotBackgroundColor = "white",
           plotBackgroundOpacity = 0.8,
           title = "Probability of an impact",
           leftArea = "Negative",
           rightArea = "Positive",
           mediumText = 18,
           bigText = 28,
           width = NULL,
           height = NULL,
           elementId = NULL,
           logoPath = NULL,
           logoSize = 100,
           logoLocation = c('bottom-left', 'top-left', 'top-right', 'bottom-right'),
           rightAreaText = "A positive impact is not necesarly a large impact.",
           leftAreaText = "A negative impact is not necesarly a large impact.") {
    verifyDataConditions(data)
    logoLocation <- match.arg(logoLocation)
    opts = list(data = dataframeToD3(data.frame(data)),
                plotBackgroundColor = plotBackgroundColor,
                plotBackgroundOpacity = plotBackgroundOpacity,
                title = title,
                leftArea = leftArea,
                rightArea = rightArea,
                mediumText = mediumText,
                bigText = bigText,
                logoPath = logoPath,
                logoSize = logoSize,
                logoLocation = logoLocation,
                rightAreaText = rightAreaText,
                leftAreaText = leftAreaText
                )

    # Define sizing policy
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = 400,
      defaultHeight = 400,
      browser.fill = TRUE
    )
    # create widget
    htmlwidgets::createWidget(
      name = 'lollipops',
      opts,
      width = width,
      height = height,
      package = 'vizdraws',
      elementId = elementId,
      sizingPolicy = sizingPolicy
    )
  }


verifyDataConditions <- function(data) {
  # Check if 'data' is a data.frame
  if (!is.data.frame(data)) {
    stop("Input is not a data.frame.")
  }

  # Check if 'data' has the required columns
  requiredColumns <- c("Name", "Prior", "Posterior")
  if (!all(requiredColumns %in% colnames(data))) {
    stop("Data.frame is missing required columns: Name, Prior, Posterior.")
  }

  # Check if 'Prior' and 'Posterior' are numeric
  if (!all(sapply(data[c("Prior", "Posterior")], is.numeric))) {
    stop("Columns 'Prior' and 'Posterior' must be numeric.")
  }

  # Check if values in 'Prior' and 'Posterior' are between 0 and 1
  if (!all(data$Prior >= 0 & data$Prior <= 1) || !all(data$Posterior >= 0 & data$Posterior <= 1)) {
    stop("Values in 'Prior' and 'Posterior' must be between 0 and 1.")
  }

  # If all conditions are met, return TRUE
  return(TRUE)
}


